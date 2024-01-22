const express = require('express');
const router = express.Router();
const {db, verifyAccessToken, checkUserRole, getUserDetails} = require('../utils');
const BarberShopDTO = require('../entities/BarberShop')
const BookingDTO = require('../entities/Booking')
const {
    BOOKING_COLLECTION,
    BARBERSHOPS_COLLECTION,
    REVIEWS_COLLECTION,
    DATE_FORMAT, SERVICES_COLLECTION
} = require("../consts");
const moment = require("moment");
const ServiceDTO = require("../entities/Service");

router.get('/get-barber-details', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    await getUserDetails(req, res, () => {
        res.status(200).json(req.userDetails);
    }, 'Barber');
});

router.post('/create-barbershop', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    try {
        const data = new BarberShopDTO(req.body)
        const plainObject = {...data};
        const docRef = await (await db.collection(BARBERSHOPS_COLLECTION).add(plainObject)).get();
        const responseData = {...plainObject, barbershopId: docRef.id};
        res.status(200).json(responseData)
    } catch (error) {
        console.error(error);
        res.status(400).json('Invalid data format');
    }
});
router.get('/get-my-barbershops', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    try {
        const userId = req.userId;
        const barbershopsSnapshot = await db.collection(BARBERSHOPS_COLLECTION)
            .where('barberId', '==', userId)
            .get();
        if (barbershopsSnapshot.empty) {
            return res.status(404).json('No barbershops found for the user');
        }
        const barbershops = barbershopsSnapshot.docs.map(doc => {
            const barbershopData = doc.data();
            return {...barbershopData, barbershopId: doc.id};
        });
        return res.status(200).json(barbershops)
    } catch (error) {
        console.error('Error in get_my_barbershops:', error);
        return res.status(500).json('Internal server error');
    }
});
router.get('/get-barbershop-by-id', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    try {
        const barbershopId = req.query.barbershopId;
        const barberId = req.userId;
        if (!barbershopId || !barberId) {
            return res.status(400).json('Please provide valid barbershop and barber IDs');
        }
        const ownershipCheck = await checkBarbershopOwnership(barbershopId, barberId);
        if (!ownershipCheck.isValid) {
            return res.status(403).json(ownershipCheck.message);
        }
        const barbershopDoc = await db.collection(BARBERSHOPS_COLLECTION).doc(barbershopId).get();
        if (!barbershopDoc.exists) {
            return res.status(404).json('Barbershop not found');
        }
        const barbershopData = barbershopDoc.data();
        return res.status(200).json(barbershopData)
    } catch (error) {
        console.error('Error in barbershop:', error);
        return res.status(500).json('Internal server error');
    }
});
router.delete('/delete-barbershop', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    try {
        const barbershopId = req.query.barbershopId;
        const barberId = req.userId;

        const ownershipCheck = await checkBarbershopOwnership(barbershopId, barberId);
        if (!ownershipCheck.isValid) {
            return res.status(403).json(ownershipCheck.message);
        }
        await db.collection(BARBERSHOPS_COLLECTION).doc(barbershopId).delete();
        return res.status(200).json('Barbershop deleted successfully')
    } catch (error) {
        console.error('Error in delete_barbershop:', error);
        return res.status(500).json('Internal server error');
    }
});
router.put('/update-barbershop', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    try {
        const barbershopId = req.query.barbershopId;
        const barberId = req.userId;
        if (!barbershopId || !barberId) {
            res.status(400).json('Please provide valid barbershop and barber IDs');
        }
        const ownershipCheck = await checkBarbershopOwnership(barbershopId, barberId);
        if (!ownershipCheck.isValid) {
            res.status(403).json(ownershipCheck.message);
        }
        const updatedData = req.body;
        await db.collection(BARBERSHOPS_COLLECTION).doc(barbershopId).update(updatedData);
        res.status(200).json(updatedData)
    } catch (error) {
        console.error('Error in update_barbershop:', error);
        res.status(500).json('Internal server error');
    }
});

router.get('/get-reviews', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    try {
        const barbershopId = req.query.barbershopId;
        const barberId = req.userId;
        const ownershipCheck = await checkBarbershopOwnership(barbershopId, barberId);
        if (!ownershipCheck.isValid) {
            return res.status(403).json(ownershipCheck.message);
        }
        const reviewsSnapshot = await db.collection(REVIEWS_COLLECTION)
            .where('barbershopId', '==', barbershopId)
            .get();
        const barbershopReviews = reviewsSnapshot.docs.map(doc => {
            const reviewData = doc.data();
            return {review_id: doc.id, ...reviewData};
        });
        res.status(200).json(barbershopReviews)

    } catch (error) {
        console.error('Error in get-reviews:', error);
        res.status(500).json('Internal server error');
    }
})

router.get('/get-closest-booking', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    try {
        const barberId = req.userId;
        const barbershopsSnapshot = await db.collection(BARBERSHOPS_COLLECTION)
            .where('barberId', '==', barberId)
            .get();
        if (barbershopsSnapshot.empty) {
            return res.status(404).json('No barbershops found for the barber');
        }
        let closestBooking = null;
        let closestBarbershopId = null;
        let upcomingBookingSnapshot = null;
        for (const barbershopDoc of barbershopsSnapshot.docs) {
            const barbershopId = barbershopDoc.id;
            const ownershipCheck = await checkBarbershopOwnership(barbershopId, barberId);
            if (!ownershipCheck.isValid) {
                return res.status(403).json(ownershipCheck.message);
            }
            const currentBookingSnapshot = await db.collection(BOOKING_COLLECTION)
                .where('barbershopId', '==', barbershopId)
                .where('date', '>=', moment().format(DATE_FORMAT))
                .orderBy('date')
                .limit(1)
                .get();
            if (!currentBookingSnapshot.empty) {
                const bookingData = currentBookingSnapshot.docs[0].data();
                const bookingDate = moment(bookingData.date, DATE_FORMAT);

                if (!closestBooking || bookingDate.isBefore(moment(closestBooking.date, DATE_FORMAT))) {
                    closestBooking = bookingData;
                    closestBarbershopId = barbershopId;
                    upcomingBookingSnapshot = currentBookingSnapshot;
                }
            }
        }
        if (!closestBooking) {
            return res.status(404).json('No upcoming bookings found for the barber');
        }

        const closestBookingWithId = Object.assign({}, {
            "barbershopId": closestBarbershopId,
            "bookingId": upcomingBookingSnapshot.docs[0].id
        }, closestBooking);
        return res.status(200).json(closestBookingWithId)
    } catch (error) {
        console.error(error);
        return res.status(500).json('Internal server error');
    }
});


router.get('/my-bookings', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    try {
        const barberId = req.userId;
        const barbershopId = req.query.barbershopId;
        const ownershipCheck = await checkBarbershopOwnership(barbershopId, barberId);
        if (!ownershipCheck.isValid) {
            return res.status(403).json(ownershipCheck.message);
        }
        const bookingSnapshot = await db.collection(BOOKING_COLLECTION)
            .where("barbershopId", "==", barbershopId)
            .get();
        if (bookingSnapshot.empty) {
            return res.status(404).json("There are no bookings available for this barbershop");
        }
        const currentDateTime = moment();
        const bookings = [];
        bookingSnapshot.forEach(doc => {
            const bookingData = doc.data();
            const bookingDate = moment(bookingData.date, DATE_FORMAT);

            if (bookingDate.isAfter(currentDateTime)) {
                const booking = new BookingDTO(bookingData);
                bookings.push(Object.assign({}, {"bookingId": doc.id}, booking));
            }
        });
        res.status(200).json(bookings)
    } catch (error) {
        console.error(error);
        res.status(500).json("Internal server error");
    }
});

router.delete('/delete-booking', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    try {
        const barberId = req.userId;
        const barbershopId = req.query.barbershopId;
        const bookingId = req.query.bookingId;

        const ownershipCheck = await checkBarbershopOwnership(barbershopId, barberId);
        if (!ownershipCheck.isValid) {
            return res.status(403).json(ownershipCheck.message);
        }

        await db.collection(BOOKING_COLLECTION).doc(bookingId).delete();

        res.status(200).json("Booking deleted successfully!");
    } catch (error) {
        console.error(error);
        res.status(400).json('Invalid data format or booking not found')
    }
});


const checkBarbershopOwnership = async (barbershopId, barberId) => {
    try {
        if (!barbershopId) {
            return {isValid: false, message: 'Please provide a valid barbershop ID'};
        }
        const barbershopDoc = await db.collection(BARBERSHOPS_COLLECTION).doc(barbershopId).get();
        if (!barbershopDoc.exists) {
            return {isValid: false, message: 'Barbershop not found'};
        }
        const barbershopData = barbershopDoc.data();
        // Check if the barbershop belongs to the specified barber
        if (barbershopData.barberId !== barberId) {
            return {isValid: false, message: 'Barbershop does not belong to the specified barber'};
        }

        return {isValid: true, message: 'Ownership check passed'};
    } catch (error) {
        console.error('Error in checkBarbershopOwnership:', error);
        return {isValid: false, message: 'Internal server error'};
    }
};

router.post('/create-service', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    try {
        const barberId = req.userId;
        const barbershopId = req.query.barbershopId;
        const ownershipCheck = await checkBarbershopOwnership(barbershopId, barberId);
        if (!ownershipCheck.isValid) {
            return res.status(403).json(ownershipCheck.message);
        }
        const serviceData = new ServiceDTO({
            serviceName: req.body.serviceName,
            price: req.body.price,
            barbershopId: barbershopId,
        });
        const plainObject = {...serviceData};
        const serviceDocRef = await db.collection(SERVICES_COLLECTION).add(plainObject);
        const serviceId = serviceDocRef.id;
        const servicePlainObject = {...serviceData, "serviceId": serviceId};
        return res.status(200).json(servicePlainObject)
    } catch (error) {
        console.error('Error in create-service:', error);
        return res.status(500).json('Internal server error');
    }
});

router.delete('/delete-service', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    try {
        const barberId = req.userId;
        const barbershopId = req.query.barbershopId;
        const serviceId = req.query.serviceId;
        const ownershipCheck = await checkBarbershopOwnership(barbershopId, barberId);
        if (!ownershipCheck.isValid) {
            return res.status(403).json(ownershipCheck.message);
        }
        await db.collection(SERVICES_COLLECTION).doc(serviceId).delete();
        return res.status(200).json('Service deleted successfully');
    } catch (error) {
        console.error('Error in delete-service:', error);
        return res.status(500).json('Internal server error');
    }
});

router.put('/update-service', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    try {
        const barberId = req.userId;
        const barbershopId = req.query.barbershopId;
        const serviceId = req.query.serviceId;
        const ownershipCheck = await checkBarbershopOwnership(barbershopId, barberId);
        if (!ownershipCheck.isValid) {
            return res.status(403).json(ownershipCheck.message);
        }
        const updatedServiceData = new ServiceDTO(req.body);
        const plainServiceObject = {...updatedServiceData};
        await db.collection(SERVICES_COLLECTION).doc(serviceId).update(plainServiceObject);
        return res.status(200).json(plainServiceObject);
    } catch (error) {
        console.error('Error in update-service:', error);
        return res.status(500).json('Internal server error');
    }
});

router.get('/get-services', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    try {
        const barbershopId = req.query.barbershopId;

        const servicesSnapshot = await db.collection(SERVICES_COLLECTION)
            .where('barbershopId', '==', barbershopId)
            .get();

        const services = servicesSnapshot.docs.map(doc => {
            const serviceData = doc.data();
            return {serviceId: doc.id, ...serviceData};
        });

        return res.status(200).json(services);
    } catch (error) {
        console.error('Error in get-services:', error);
        return res.status(500).json('Internal server error');
    }
});
module.exports = router;