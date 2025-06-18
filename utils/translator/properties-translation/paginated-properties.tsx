import axios from "axios";

// Returns the appropriate status label based on soldOut flag, status type, and optional custom message
const getSoldStatusLabel = (data: any) => {
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

const convertResponseArrayObject = async (data: any[]) => {
  let convertedArray: string[] = [];

  // Extract the 'translatedText' from each object and add to the convertedArray
  await data.forEach((item) => {
    if (item?.translatedText) {
      convertedArray.push(item.translatedText);
    }
  });

  return convertedArray;
};

/* to convert array od object data into translated atring array structure */
const convertToStringArray = async (data: any, globalState: any) => {
  let convertedArray: any = [];
  await data?.forEach((item: any) => {
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
      item?.propertyLabel ? item.propertyLabel : "-"
    );
  });
  return convertedArray;
};

/* to convert string data into array of object */
const convertArrayObject = async (data: string[]) => {
  let convertedArray: any[] = [];
  const response: any = await convertResponseArrayObject(data);
  const keysPerObject = 9; // Each object will have 8 keys: title, address, currency

  // Loop through the data in chunks of 3
  for (let i = 0; i < response.length; i += keysPerObject) {
    // Take a slice of the array for each chunk (3 elements)
    const chunk = response.slice(i, i + keysPerObject);

    // Create an object for each chunk with title, address, and currency
    const obj: any = {
      title: chunk[0],
      address: chunk[1],
      bedrooms: chunk[2],
      bathrooms: chunk[3],
      developer: chunk[4],
      area: chunk[5],
      currency: chunk[6],
      propertyStatusMessage: chunk[7] !== "-" ? chunk[7] : "",
      propertyLabel: chunk[8] !== "-" ? chunk[8] : "",
    };

    // Push the object to the converted array
    convertedArray.push(obj);
  }

  return convertedArray;
};

export const translateDynamicText = async (
  dynamicText: any,
  limit: any,
  globalState: any
) => {
  const url: any = process.env.NEXT_PUBLIC_TRANSLATED_KEY_URL;
  const convertToString = await convertToStringArray(dynamicText, globalState);

  const headers = {
    "x-goog-api-key": process.env.NEXT_PUBLIC_TRANSLATED_SECRET_KEY_EMPIRE,
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
    const convertedArray: any = await convertArrayObject(
      response.data.data.translations
    );

    dynamicText = dynamicText.map((item: any, index: any) => {
      const translated = convertedArray[index];
      if (translated) {
        return {
          ...item,
          title: translated.title || item.title,
          address: translated.address || item.address,
          bedrooms: translated.bedrooms || item.bedrooms,
          bathrooms: translated.bathrooms || item.bathrooms,
          developer: translated.developer || item.developer,
          area: translated.area || item.area,
          currency: translated.currency || "",
          propertyStatusMessage: translated.propertyStatusMessage || "",
          propertyLabel: translated.propertyLabel || "",
        };
      }
      return item;
    });
  } catch (error) {
    return false;
  }

  return dynamicText;
};
