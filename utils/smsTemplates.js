import axios from "axios";



export const admissionApprovalTemplate = async(findAdmission, acknowledgementNumber)=>{
         const options = {
            method: "POST",
            url: "https://www.fast2sms.com/dev/bulkV2",
            headers: {
              authorization: `${process.env.FAST2SMS_API_KEY}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            data: {
              route: "dlt",
              sender_id: "SCHDEN",
              message: "182187",
              variables_values: `${acknowledgementNumber}|`,
              flash: 0,
              numbers: `${findAdmission?.parentsContactNumber}`,
            },
          };
          let otpStoreData;
          // Make the API request to Fast2SMS
          const response = await axios.post(options.url, options.data, {
            headers: options.headers,
          });
    
          console.log("response of sms ", response.data);
}


export const otpVerification = async (otp, mobileNumber) =>{


  console.log("otp from otpverification", otp, mobileNumber);
   const options = {
        method: "POST",
        url: "https://www.fast2sms.com/dev/bulkV2",
        headers: {
          authorization: `${process.env.FAST2SMS_API_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        data: {
          route: "dlt",
          sender_id: "SCHDEN",
          message: "182187",
          variables_values: `${otp}|`,
          flash: 0,
          numbers: `${mobileNumber}`,
        },
      };

      // Make the API request to Fast2SMS
      const response = await axios.post(options.url, options.data, {
        headers: options.headers,
      });


      return response;
}



// export const SMSForRegisteredStudent


