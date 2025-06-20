const axios = require("axios");

// Returns the appropriate status label based on soldOut flag, status type, and optional custom message
const getSoldStatusLabel = (data) => {
  if (data?.soldOut && data?.propertyStatusMessage) {
    return data?.propertyStatusMessage;
  } else if (
    data?.soldOut &&
    (data?.status === "OFF_PLAN" || data?.status === "SALE")
  ) {
    return "Sold";
  } else if (data?.soldOut && data?.status === "RENT") {
    return "Rented";
  } else {
    return "-";
  }
};

const convertResponseArrayObject = async (data) => {
  let convertedArray = [];

  // Extract the 'translatedText' from each object and add to the convertedArray
  await data.forEach((item) => {
    if (item?.translatedText) {
      convertedArray.push(item.translatedText);
    }
  });

  return convertedArray;
};

/* to convert array od object data into translated atring array structure */
const convertToStringArray = async (data, globalState) => {
  let convertedArray = [];
  await data?.forEach((item) => {
    const soldStatusLabel = getSoldStatusLabel(item);
    convertedArray.push(
      item?.title,
      item?.address ? item?.address : "-",
      item?.bedrooms ? item?.bedrooms : "-",
      item?.bathrooms ? item?.bathrooms : "-",
      item?.developer !== "none" ? item?.developer : "-",
      item?.area ? item?.area : "-",
      globalState?.selectedCurrency,
      soldStatusLabel,
      item?.propertyLabel ? item.propertyLabel : "-",
      item?.description ? item?.description : "-"
    );
  });
  return convertedArray;
};

/* to convert string data into array of object */
const convertArrayObject = async (data) => {
  let convertedArray = [];
  const response = await convertResponseArrayObject(data);
  const keysPerObject = 10; // Each object will have 8 keys: title, address, currency
  console.log("response-------", response);
  // Loop through the data in chunks of 3
  for (let i = 0; i < response.length; i += keysPerObject) {
    // Take a slice of the array for each chunk (3 elements)
    const chunk = response.slice(i, i + keysPerObject);

    // Create an object for each chunk with title, address, and currency
    const obj = {
      title: chunk[0],
      address: chunk[1],
      bedrooms: chunk[2],
      bathrooms: chunk[3],
      developer: chunk[4],
      area: chunk[5],
      currency: chunk[6],
      propertyStatusMessage: chunk[7] !== "-" ? chunk[7] : "",
      propertyLabel: chunk[8] !== "-" ? chunk[8] : "",
      description: chunk[9] !== "-" ? chunk[9] : "",
    };

    // Push the object to the converted array
    convertedArray.push(obj);
  }

  return convertedArray;
};

const translateDynamicText = async (
  dynamicText,
  targetLanguage
) => {
  const url = process.env.TRANSLATION_API_URL;
  // console.log("convertToString", dynamicText);
  const convertToString = await convertToStringArray(dynamicText, targetLanguage);
  // console.log("convertToString", convertToString);

  const headers = {
    "x-goog-api-key": process.env.TRANSLATION_API_SECRET,
    "Content-Type": "application/json",
  };

  const payload = {
    q: convertToString,
    source: "en",
    target: targetLanguage?.toLowerCase(),
    format: "html",
  };

  try {
    const response = await axios.post(url, payload, { headers });
    // console.log("response-------", response);

    const convertedArray = await convertArrayObject(
      response.data.data.translations
    );

    // console.log("convertedArray-------", convertedArray);
    dynamicText.forEach((item, index) => {
      const translated = convertedArray[index];
      if (translated) {
        item.set({
          title: translated.title ?? item.title,
          address: translated.address ?? item.address,
          bedrooms: translated.bedrooms ?? item.bedrooms,
          bathrooms: translated.bathrooms ?? item.bathrooms,
          developer: translated.developer ?? item.developer,
          area: translated.area ?? item.area,
          currency: translated.currency ?? item.currency ?? "",
          propertyStatusMessage: translated.propertyStatusMessage ?? item.propertyStatusMessage ?? "",
          propertyLabel: translated.propertyLabel ?? item.propertyLabel ?? "",
          description: translated.description ?? item.description,
        });
      }
    });


  } catch (error) {
    return error;
  }

  return dynamicText;
};

module.exports = {
  translateDynamicText
}