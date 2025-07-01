import axios from "axios";

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

/* to convert string data into array of object */
const convertArrayObject = async (data) => {
  let convertedArray = [];
  const response = await convertResponseArrayObject(data);
  const keysPerObject = 1; // Each object will have 1 keys: title

  // Loop through the data in chunks of 3
  for (let i = 0; i < response.length; i += keysPerObject) {
    // Take a slice of the array for each chunk (3 elements)
    const chunk = response.slice(i, i + keysPerObject);

    // Create an object for each chunk with title, address, and currency
    const obj = {
      title: chunk[0],
    };

    // Push the object to the converted array
    convertedArray.push(obj);
  }

  return convertedArray;
};

/* to convert array od object data into translated atring array structure */
const convertToStringArray = async (data) => {
  let convertedArray = [];
  await data?.forEach((item) => {
    convertedArray.push(item?.title);
  });
  return convertedArray;
};

export const translateMapCardText = async (
  dynamicText,
  globalState
) => {
  const url = process.env.TRANSLATION_API_URL;

  const convertToString = await convertToStringArray(dynamicText);

  const headers = {
    "x-goog-api-key": process.env.TRANSLATION_API_SECRET,
    "Content-Type": "application/json",
  };

  const payload = {
    q: convertToString,
    source: "en",
    target: globalState?.selectedLanguage?.toLowerCase(),
    format: "html",
  };

  try {
    const response = await axios.post(url, payload, { headers });
    const convertedArray = await convertArrayObject(
      response.data.data.translations
    );

    dynamicText = dynamicText.map((item, index) => {
      const translated = convertedArray[index];
      return translated
        ? {
          ...item,
          title: translated.title || item.title,
        }
        : item;
    });
  } catch (error) {
    return false;
  }

  return dynamicText;
};
