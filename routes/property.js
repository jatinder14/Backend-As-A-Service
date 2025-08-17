const express = require('express');
const Property = require('../models/Property');
const { generateSignedUrl, getKey } = require('../utils/s3');
const getExchangeRates = require('../utils/currency');
const router = express.Router();
const { verifyToken, adminRole, hrOrAdmin } = require('../middleware/auth');
const mongoose = require('mongoose');
const {
  translateDynamicText,
} = require('../utils/translator/properties-translation/paginated-properties');
const isValidObjectId = mongoose.Types.ObjectId.isValid;

// const { notifyOMs } = require('../websockets/websocket');
// const Notification = require('../models/notification');

router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      location,
      type,
      bathrooms,
      bedrooms,
      title,
      soldOut,
      saleOrRentprice,
      orderBy,
      sortBy,
      referenceNumber,
      lang,
      isPropertyUnPublished,
      publishing_status,
    } = req.query;
    let mapLocations = [];
    const query = {};

    if (status) {
      if (status === 'SALES_ALL') {
        query.status = { $in: ['SALE', 'SALE_OFF_PLAN'] };
      } else {
        query.status = { $regex: status, $options: 'i' };
      }
    } else {
      // Exclude these values if no status is provided
      query.status = { $nin: ['UNPUBLISHED', 'unpublished'] };
    }

    if (publishing_status) {
      query.publishing_status = { $regex: publishing_status, $options: 'i' };
    }

    if (title) query.title = { $regex: title, $options: 'i' };

    if (location) {
      query.$or = [
        ...(query.$or || []),
        { location: { $regex: location, $options: 'i' } },
        { address: { $regex: location, $options: 'i' } },
      ];
    }

    if (isPropertyUnPublished) query.isPropertyUnPublished = isPropertyUnPublished;

    if (referenceNumber) query.referenceNumber = referenceNumber;

    if (soldOut) query.soldOut = soldOut;

    if (type) query.type = type;

    if (saleOrRentprice) query.saleOrRentprice = { $lte: saleOrRentprice };

    if (bathrooms)
      query.bathrooms = {
        $gte: bathrooms,
      };

    if (bedrooms) query.bedrooms = { $gte: bedrooms };

    console.log('query---', query);
    // let totalPropertys = await Property.find(query).limit(10);
    let totalPropertys = await Property.find(query);

    // Default sort field and order
    const sortField = sortBy || 'createdAt'; // fallback field
    const sortOrder = orderBy === 'asc' ? 1 : -1; // ascending or descending

    const properties = await Property.find(query)
      .sort({ [sortField]: sortOrder })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy')
      .populate('updatedBy');

    const fromCurrency = 'AED';
    const toCurrency = req.query?.toCurrency?.toUpperCase();

    let conversionRate = 1;
    if (fromCurrency !== toCurrency)
      conversionRate = await getExchangeRates(fromCurrency, toCurrency);

    // Generate signed URLs for logos and images in parallel for each Property
    let propertiesWithSignedUrls = await Promise.all(
      properties.map(async property => {
        if (fromCurrency !== toCurrency) {
          if (property.saleOrRentprice && conversionRate) {
            property.saleOrRentprice = (property.saleOrRentprice * conversionRate).toFixed(2);
          }
        }

        if (!property?.importedFromCrm) {
          const dldPermitQrCodePromise = property.dldPermitQrCode
            ? generateSignedUrl(getKey(property.dldPermitQrCode))
            : null;

          const imagesPromises =
            property.images && Array.isArray(property.images)
              ? property.images.map(image => generateSignedUrl(getKey(image?.url)))
              : [];

          const videoPromises =
            property.videos && Array.isArray(property.videos)
              ? property.videos.map(el => generateSignedUrl(getKey(el?.url)))
              : [];

          const floorPlanImagePromises =
            property.floorPlans && Array.isArray(property.floorPlans)
              ? property.floorPlans.map(el => {
                  if (el.floorPlanImage) generateSignedUrl(getKey(el?.floorPlanImage));
                })
              : [];

          // Await all promises concurrently
          const [
            dldPermitQrCodeSignedUrl,
            imagesSignedUrls,
            videosSignedUrls,
            floorPlanImageSignedUrls,
          ] = await Promise.all([
            dldPermitQrCodePromise,
            Promise.all(imagesPromises),
            Promise.all(videoPromises),
            Promise.all(floorPlanImagePromises),
          ]);

          // Assign the results to Property fields
          property.dldPermitQrCode = dldPermitQrCodeSignedUrl;

          if (property.images?.length === imagesSignedUrls?.length) {
            property.images = property.images.map((img, index) => ({
              ...img,
              url: imagesSignedUrls[index],
            }));
          }

          if (property.videos?.length === videosSignedUrls?.length) {
            property.videos.forEach((video, index) => ({
              ...video,
              url: videosSignedUrls[index],
            }));
          }

          if (property.floorPlans?.length === floorPlanImageSignedUrls?.length) {
            property.floorPlans.forEach((el, index) => {
              // console.log(el, index);
              el.floorPlanImage = floorPlanImageSignedUrls[index];
            });
          }
          // console.log(property.floorPlans);
        }
        return property;
      })
    );

    // if (lang && lang != 'en') {
    //     propertiesWithSignedUrls = await translateDynamicText(propertiesWithSignedUrls, lang)
    //     // totalPropertys = await translateDynamicText(totalPropertys, lang)
    // }
    // console.log("totalPropertys------", totalPropertys);

    await Promise.all(
      totalPropertys.map(async property => {
        if (!property?.importedFromCrm) {
          const imagesPromises =
            property.images && Array.isArray(property.images)
              ? generateSignedUrl(getKey(property?.images?.[0]?.url))
              : [];

          // Await all promises concurrently
          const imagesSignedUrls = await imagesPromises;

          if (property.images?.length === imagesSignedUrls?.length) {
            property.images = property.images.map((img, index) => ({
              ...img,
              url: imagesSignedUrls[index],
            }));
          }
        }

        mapLocations.push({
          id: property?.id,
          slug: property?.slug,
          latitude: property?.latitude,
          longitude: property?.longitude,
          title: property?.title,
          description: property?.description,
          images: property?.images,
          saleOrRentprice: property?.saleOrRentprice,
        });
      })
    );

    res.json({
      totalPropertys: totalPropertys.length,
      currentPage: page,
      currentPageCount: limit,
      totalPages: Math.ceil(totalPropertys.length / limit),
      properties: propertiesWithSignedUrls,
      mapLocationsCount: mapLocations.length,
      mapLocations,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:idOrSlug', async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    // const { lang } = req.query;

    let property;

    if (isValidObjectId(idOrSlug)) {
      property = await Property.findById(idOrSlug);
    }

    // If not found by ID or if not a valid ObjectId, try slug
    if (!property) {
      property = await Property.findOne({ slug: idOrSlug });
    }

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    await property.populate('createdBy');
    await property.populate('updatedBy');

    const fromCurrency = 'AED';
    const toCurrency = req.query?.toCurrency?.toUpperCase();
    if (fromCurrency !== toCurrency) {
      const conversionRate = await getExchangeRates(
        property?.baseCurrency || fromCurrency,
        toCurrency
      );

      // Convert sale or rent price
      if (property.saleOrRentprice && conversionRate) {
        property.saleOrRentprice = (property.saleOrRentprice * conversionRate).toFixed(2); // Convert and format to 2 decimal places
        // console.log(conversionRate, property?.baseCurrency, toCurrency, (property.saleOrRentprice * conversionRate).toFixed(2), property.saleOrRentprice)
        // property.baseCurrency = toCurrency;  // Update the currency field to the target currency
      }
    }
    if (!property?.importedFromCrm) {
      const dldPermitQrCodePromise = property.dldPermitQrCode
        ? generateSignedUrl(getKey(property.dldPermitQrCode))
        : null;

      const imagesPromises =
        property.images && Array.isArray(property.images)
          ? property.images.map(image => generateSignedUrl(getKey(image?.url)))
          : [];

      const videoPromises =
        property.videos && Array.isArray(property.videos)
          ? property.videos.map(el => generateSignedUrl(getKey(el?.url)))
          : [];

      const floorPlanImagePromises =
        property.floorPlans && Array.isArray(property.floorPlans)
          ? property.floorPlans.map(el => generateSignedUrl(getKey(el?.floorPlanImage)))
          : [];

      // Await all promises concurrently
      const [
        dldPermitQrCodeSignedUrl,
        imagesSignedUrls,
        videosSignedUrls,
        floorPlanImageSignedUrls,
      ] = await Promise.all([
        dldPermitQrCodePromise,
        Promise.all(imagesPromises),
        Promise.all(videoPromises),
        Promise.all(floorPlanImagePromises),
      ]);

      // Assign the results to Property fields
      property.dldPermitQrCode = dldPermitQrCodeSignedUrl;

      if (property.images?.length === imagesSignedUrls?.length) {
        property.images = property.images.map((img, index) => ({
          ...img,
          url: imagesSignedUrls[index],
        }));
      }

      if (property.videos?.length === videosSignedUrls?.length) {
        property.videos.forEach((video, index) => ({
          ...video,
          url: videosSignedUrls[index],
        }));
      }

      if (property.floorPlans?.length === floorPlanImageSignedUrls?.length) {
        property.floorPlans.forEach((el, index) => {
          // console.log(el, index);
          el.floorPlanImage = floorPlanImageSignedUrls[index];
        });
      }
    }

    // if (lang && lang != 'en') {
    //     let translatedPropertyList = await translateDynamicText([property], lang)
    //     property = translatedPropertyList[0];
    // }

    res.status(200).json({ property: property });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.use(verifyToken, adminRole);

router.post('/', async (req, res) => {
  try {
    if (req.body?.referenceNumber) {
      const existingProperty = await Property.findOne({
        referenceNumber: req.body?.referenceNumber,
      });

      if (existingProperty)
        return res.status(409).json({
          message: 'Property With Reference Number already exists',
          referenceNumber: req.body?.referenceNumber,
          existingProperty,
        }); // 409 Conflict
    }
    const userId = req.user?.id;

    const property = new Property(req.body);

    property.createdBy = userId;
    await property.save();
    await property.populate('createdBy');

    res.status(201).json({ message: 'Property created successfully', property }); // 201 Created
  } catch (err) {
    res.status(400).json({ message: err.message }); // 400 Bad Request (can be customized further)
  }
});

router.post('/bulkAdd', async (req, res) => {
  try {
    const properties = req.body.properties;
    const addedProperties = [];

    if (!Array.isArray(properties)) {
      return res.status(400).json({ message: 'Expected an array of properties' });
    }

    const referenceNumbers = properties.map(p => p.referenceNumber);

    // Find all existing referenceNumbers
    const existing = await Property.find({ referenceNumber: { $in: referenceNumbers } }).select(
      'referenceNumber'
    );
    const existingRefs = new Set(existing.map(p => p.referenceNumber));
    const userId = req.user?.id;

    const updatedProperties = await Promise.all(
      existing.map(async ({ _id, ...data }) => {
        // if (data?.slug) delete data.slug;
        data.updatedBy = userId;
        return Property.findByIdAndUpdate(_id, data, { new: true, runValidators: true })
          .populate('createdBy')
          .populate('updatedBy');
      })
    );

    // Filter only new properties
    const newProperties = properties.filter(p => !existingRefs.has(p.referenceNumber));

    // if (newProperties.length === 0) {
    //     return res.status(409).json({ message: 'All properties already exist' });
    // }

    for (const propertyData of newProperties) {
      const property = new Property(propertyData);
      property.createdBy = userId;

      await property.save(); // triggers pre('save')
      await property.populate('createdBy');

      addedProperties.push(property);
    }

    res.status(201).json({
      message: `${addedProperties.length} properties added successfully and ${updatedProperties.length} properties updated successfully`,
      addedProperties,
      updatedProperties,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.patch('/bulkUpdateByStatus', async (req, res) => {
  try {
    const { oldStatus, newStatus } = req.body;

    if (!oldStatus || !newStatus) {
      return res.status(400).json({ message: 'Both oldStatus and newStatus are required' });
    }

    const result = await Property.updateMany(
      { status: oldStatus },
      {
        $set: {
          status: newStatus,
          updatedBy: req.user?.id,
        },
      },
      { runValidators: true }
    );

    res.status(200).json({
      message: `Status updated from '${oldStatus}' to '${newStatus}'`,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      result,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/bulkUpdate', async (req, res) => {
  try {
    const properties = req.body.properties;

    if (!Array.isArray(properties)) {
      return res.status(400).json({ message: 'Expected an array of properties' });
    }

    const results = await Promise.all(
      properties.map(async ({ _id, ...data }) => {
        // if (data?.slug) delete data.slug;
        data.updatedBy = req.user?.id;
        return Property.findByIdAndUpdate(_id, data, { new: true, runValidators: true })
          .populate('createdBy')
          .populate('updatedBy');
      })
    );

    res.status(200).json({ message: 'Bulk update completed', results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    // if (req.body.slug) delete req.body.slug
    req.body.updatedBy = req.user?.id;

    const property = await Property.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('updatedBy')
      .populate('createdBy');
    if (!property) return res.status(404).json({ message: 'Property not found' });
    res.status(200).json({ message: 'property updated successfully', property });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const property = await Property.findByIdAndDelete(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    res.status(200).json({ message: 'Property deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// async function backfillSlugs() {

//     const docs = await Property.find({ slug: { $exists: false } });
//     for (const doc of docs) {
//         // re‑assign title to itself to trip your pre('save') logic:
//         doc.title = doc.title;
//         await doc.save();
//     }
//     console.log(`✅ Backfilled ${docs.length} slugs`);
// }

// backfillSlugs()

module.exports = router;
