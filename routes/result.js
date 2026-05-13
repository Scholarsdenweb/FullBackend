const express = require("express");
const axios = require("axios");
const archiver = require("archiver");
const { PDFDocument } = require("pdf-lib");
const cloudinary = require("../config/cloudinaryConfig");

const Result = require("../models/Result");
const CombinedResult = require("../models/CombinedResult");
const { sendResultNotification } = require("../utils/services/whatsappService");
const router = express.Router();
const MAX_COMBINED_PDF_BYTES = 100 * 1024 * 1024;

const streamPdfFromUrl = async (url, res, fileName) => {
    const response = await axios.get(url, { responseType: "stream" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    response.data.pipe(res);
};

const uploadCombinedPdf = (buffer, examDate) => {
    const publicId = `combined_results/sdat_results_${String(examDate).replace(/[^a-z0-9]/gi, "_")}`;

    return new Promise((resolve, reject) => {
        const uploadMethod =
            typeof cloudinary.uploader.upload_large_stream === "function"
                ? cloudinary.uploader.upload_large_stream.bind(cloudinary.uploader)
                : cloudinary.uploader.upload_stream.bind(cloudinary.uploader);

        const uploadStream = uploadMethod(
            {
                resource_type: "raw",
                public_id: publicId,
                overwrite: true,
                chunk_size: 6 * 1024 * 1024,
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            },
        );

        uploadStream.end(buffer);
    });
};

const createCombinedPdfParts = async (results, maxBytes = MAX_COMBINED_PDF_BYTES) => {
    const parts = [];
    let mergedPdf = await PDFDocument.create();
    let currentBuffer = null;
    let currentCount = 0;

    for (const result of results) {
        const response = await axios.get(result.resultUrl, { responseType: "arraybuffer" });
        const sourcePdf = await PDFDocument.load(response.data);
        const pages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));
        const trialBuffer = Buffer.from(await mergedPdf.save());

        if (trialBuffer.length > maxBytes && currentCount > 0 && currentBuffer) {
            parts.push(currentBuffer);

            mergedPdf = await PDFDocument.create();
            const freshPages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
            freshPages.forEach((page) => mergedPdf.addPage(page));
            currentBuffer = Buffer.from(await mergedPdf.save());
            currentCount = 1;
            continue;
        }

        currentBuffer = trialBuffer;
        currentCount += 1;
    }

    if (currentBuffer) {
        parts.push(currentBuffer);
    }

    return parts;
};

const streamPdfPartsZip = (parts, res, baseFileName) => {
    const zipFileName = baseFileName.replace(/\.pdf$/i, ".zip");
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipFileName}"`);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (error) => {
        throw error;
    });
    archive.pipe(res);

    parts.forEach((buffer, index) => {
        archive.append(buffer, {
            name: baseFileName.replace(/\.pdf$/i, `_part_${index + 1}.pdf`),
        });
    });

    archive.finalize();
};

const parseExamDate = (value = "") => {
    const text = String(value).trim();
    if (!text) return null;

    const parts = text.split(/[./-]/).map((part) => part.trim());
    if (parts.length === 3) {
        const [first, second, third] = parts;
        const yearFirst = first.length === 4;
        const year = Number(yearFirst ? first : third);
        const month = Number(second);
        const day = Number(yearFirst ? third : first);
        const date = new Date(year, month - 1, day);
        if (!Number.isNaN(date.getTime())) return date;
    }

    const fallback = new Date(text);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const normalizeSendError = (error) => {
    if (!error) return "Unable to send WhatsApp message.";
    return typeof error === "string" ? error : JSON.stringify(error);
};

const sendResultOnWhatsApp = async (result) => {
    if (result.whatsappSent) {
        return {
            success: true,
            alreadySent: true,
            result,
            message: "Result already sent on WhatsApp.",
        };
    }

    const sendResponse = await sendResultNotification(result.StudentId, {
        StudentId: result.StudentId,
        resultUrl: result.resultUrl,
        examDate: result.examDate,
    });

    if (sendResponse.success) {
        result.whatsappSent = true;
        result.whatsappSentAt = new Date();
        result.whatsappError = "";
        await result.save();

        return {
            success: true,
            result,
            message: "Result sent on WhatsApp successfully.",
        };
    }

    result.whatsappError = normalizeSendError(sendResponse.error);
    await result.save();

    return {
        success: false,
        result,
        error: result.whatsappError,
    };
};

router.get("/dates", async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const start = parseExamDate(startDate);
        const end = parseExamDate(endDate);

        if (end) end.setHours(23, 59, 59, 999);

        const groupedDates = await Result.aggregate([
            {
                $group: {
                    _id: "$examDate",
                    count: { $sum: 1 },
                },
            },
        ]);

        const dates = groupedDates
            .map((item) => {
                const parsedDate = parseExamDate(item._id);
                return {
                    examDate: item._id,
                    count: item.count,
                    sortDate: parsedDate ? parsedDate.getTime() : 0,
                };
            })
            .filter((item) => {
                if (!item.sortDate) return !start && !end;
                if (start && item.sortDate < start.getTime()) return false;
                if (end && item.sortDate > end.getTime()) return false;
                return true;
            })
            .sort((a, b) => b.sortDate - a.sortDate)
            .map(({ examDate, count }) => ({ examDate, count }));

        res.json(dates);
    } catch (err) {
        console.error("Error fetching result dates:", err);
        res.status(500).json({ error: "Server error" });
    }
});

router.post("/combined-pdf", async (req, res) => {
    try {
        const { date: examDate } = req.body;
        const skipCache = true;

        if (!examDate) {
            return res.status(400).json({ message: "Exam date is required." });
        }

        const fileName = `SDAT_Results_${String(examDate).replace(/[^\w.-]/g, "_")}.pdf`;
        const cachedResult = skipCache ? null : await CombinedResult.findOne({ examDate });

        if (cachedResult?.combinedPdfUrl) {
            return streamPdfFromUrl(cachedResult.combinedPdfUrl, res, fileName);
        }

        const results = await Result.find({
            examDate,
            resultUrl: { $exists: true, $nin: [null, ""] },
        }).sort({ StudentId: 1 });

        if (!results.length) {
            return res.status(404).json({ message: "No results found for the given exam date." });
        }

        const combinedPdfParts = await createCombinedPdfParts(results);
        if (skipCache) {
            if (combinedPdfParts.length > 1) {
                return streamPdfPartsZip(combinedPdfParts, res, fileName);
            }

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
            return res.send(combinedPdfParts[0]);
        }

        const combinedPdfBuffer = combinedPdfParts[0];
        const uploadResult = await uploadCombinedPdf(combinedPdfBuffer, examDate);

        await CombinedResult.findOneAndUpdate(
            { examDate },
            {
                examDate,
                combinedPdfUrl: uploadResult.secure_url || uploadResult.url,
                cloudinaryPublicId: uploadResult.public_id,
                resultCount: results.length,
            },
            { upsert: true, new: true },
        );

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        return res.send(combinedPdfBuffer);
    } catch (err) {
        console.error("Error creating combined result PDF:", err);
        return res.status(500).json({ message: "Error creating combined result PDF." });
    }
});

router.post("/send-whatsapp", async (req, res) => {
    try {
        const { resultId } = req.body;

        if (!resultId) {
            return res.status(400).json({ message: "Result id is required." });
        }

        const result = await Result.findById(resultId);
        if (!result) {
            return res.status(404).json({ message: "Result not found." });
        }

        const sendStatus = await sendResultOnWhatsApp(result);
        if (!sendStatus.success) {
            return res.status(400).json({
                message: sendStatus.error || "Unable to send result on WhatsApp.",
                result: sendStatus.result,
            });
        }

        return res.json(sendStatus);
    } catch (err) {
        console.error("Error sending result WhatsApp:", err);
        return res.status(500).json({ message: "Error sending result on WhatsApp." });
    }
});

router.post("/send-whatsapp/bulk", async (req, res) => {
    try {
        const { date: examDate } = req.body;

        if (!examDate) {
            return res.status(400).json({ message: "Exam date is required." });
        }

        const results = await Result.find({
            examDate,
            resultUrl: { $exists: true, $nin: [null, ""] },
        }).sort({ StudentId: 1 });

        if (!results.length) {
            return res.status(404).json({ message: "No results found for the selected date." });
        }

        const sentResults = [];
        const failedResults = [];
        let alreadySent = 0;

        for (const result of results) {
            const sendStatus = await sendResultOnWhatsApp(result);

            if (sendStatus.alreadySent) {
                alreadySent += 1;
                sentResults.push(sendStatus.result);
                continue;
            }

            if (sendStatus.success) {
                sentResults.push(sendStatus.result);
            } else {
                failedResults.push({
                    result: sendStatus.result,
                    error: sendStatus.error,
                });
            }
        }

        return res.json({
            success: failedResults.length === 0,
            message: failedResults.length
                ? "Bulk WhatsApp sending completed with some failed messages."
                : "Bulk WhatsApp sending completed successfully.",
            summary: {
                total: results.length,
                sent: sentResults.length - alreadySent,
                alreadySent,
                failed: failedResults.length,
            },
            results: [...sentResults, ...failedResults.map((item) => item.result)],
            failedResults,
        });
    } catch (err) {
        console.error("Error sending bulk result WhatsApp:", err);
        return res.status(500).json({ message: "Error sending bulk result WhatsApp messages." });
    }
});




router.get("/", async (req, res) => {
    console.log("hello");
    const { page = 1, limit = 20, date } = req.query;
    const query = date ? { examDate: date } : {}; // Filter by date if provided


    console.log("query", query);

    console.log("page", page);
    console.log("limit", limit);

    try {
        const results = await Result.find(query)
            .sort({ examDate: -1 }) // Sort by date (latest first)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.json(results);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});



module.exports = router;
