import axios from 'axios';

/* To reconvert it back to string array from API response strucure */
const convertResponseArrayObject = async data => {
  let convertedArray = [];

  // Extract the 'translatedText' from each object and add to the convertedArray
  await data.forEach(item => {
    if (item?.translatedText) {
      convertedArray.push(item.translatedText);
    }
  });

  return convertedArray;
};

export const translateBlogDetail = async (dynamicText, globalState) => {
  const url = process.env.TRANSLATION_API_URL;
  const headers = {
    'x-goog-api-key': process.env.TRANSLATION_API_SECRET,
    'Content-Type': 'application/json',
  };

  const payload = {
    q: dynamicText,
    source: 'en',
    target: globalState?.selectedLanguage?.toLowerCase(),
    format: 'html',
  };

  try {
    const response = await axios.post(url, payload, { headers });
    const convertedArray = await convertResponseArrayObject(response.data.data.translations);

    dynamicText = convertedArray;
  } catch (error) {
    return false;
  }

  return dynamicText;
};
