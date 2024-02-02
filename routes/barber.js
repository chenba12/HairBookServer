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

router.get('/get-barber-details', verifyAccessToken, checkUserRole(['Barber']), async (req, res) => {
    await getUserDetails(req, res, () => {
        res.status(200).json(req.userDetails);
    }, 'Barber');
});

router.post('/create-barbershop', verifyAccessToken, checkUserRole(['Barber']), async (req, res) => {
    try {
        req.body.barberId = req.userId;
        const data = new BarberShopDTO(req.body)
        console.log(data)

        const plainObject = {...data};
        const docRef = await (await db.collection(BARBERSHOPS_COLLECTION).add(plainObject)).get();
        const responseData = {...plainObject, barberShopId: docRef.id};
        res.status(200).json(responseData)
    } catch (error) {
        console.error(error);
        res.status(400).json('Invalid data format');
    }
});

router.get('/get-number-of-shops', verifyAccessToken, checkUserRole(['Barber']), async (req, res) => {
    try {
        const userId = req.userId;
        const barbershopsSnapshot = await db.collection(BARBERSHOPS_COLLECTION)
            .where('barberId', '==', userId)
            .get();
        res.status(200).json(barbershopsSnapshot.size);
    } catch (error) {
        console.error(error);
        res.status(500).json('Internal server error');
    }
});
router.get('/get-my-barbershops', verifyAccessToken, checkUserRole(['Barber']), async (req, res) => {
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
            return {...barbershopData, barberShopId: doc.id};
        });
        return res.status(200).json(barbershops)
    } catch (error) {
        console.error('Error in get_my_barbershops:', error);
        return res.status(500).json('Internal server error');
    }
});
router.get('/get-barbershop-by-id', verifyAccessToken, checkUserRole(['Barber']), async (req, res) => {
    try {
        const barberShopId = req.query.barberShopId;
        const barberId = req.userId;
        if (!barberShopId || !barberId) {
            return res.status(400).json('Please provide valid barbershop and barber IDs');
        }
        const ownershipCheck = await checkBarbershopOwnership(barberShopId, barberId);
        if (!ownershipCheck.isValid) {
            return res.status(403).json(ownershipCheck.message);
        }
        const barbershopDoc = await db.collection(BARBERSHOPS_COLLECTION).doc(barberShopId).get();
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
router.delete('/delete-barbershop', verifyAccessToken, checkUserRole(['Barber']), async (req, res) => {
    try {
        const barberShopId = req.query.barberShopId;
        const barberId = req.userId;
        const ownershipCheck = await checkBarbershopOwnership(barberShopId, barberId);
        if (!ownershipCheck.isValid) {
            return res.status(403).json(ownershipCheck.message);
        }
        const reviewsSnapshot = await db.collection(REVIEWS_COLLECTION)
            .where('barberShopId', '==', barberShopId)
            .get();
        const batch = db.batch();
        reviewsSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        const bookingsSnapshot = await db.collection(BOOKING_COLLECTION)
            .where('barberShopId', '==', barberShopId)
            .get();

        bookingsSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        await db.collection(BARBERSHOPS_COLLECTION).doc(barberShopId).delete();
        return res.status(200).json('Barbershop and related reviews/bookings deleted successfully')
    } catch (error) {
        console.error('Error in delete_barbershop:', error);
        return res.status(500).json('Internal server error');
    }
});
router.put('/update-barbershop', verifyAccessToken, checkUserRole(['Barber']), async (req, res) => {
    try {
        const barberShopId = req.query.barberShopId;
        const barberId = req.userId;
        if (!barberShopId || !barberId) {
            res.status(400).json('Please provide valid barbershop and barber IDs');
        }
        const ownershipCheck = await checkBarbershopOwnership(barberShopId, barberId);
        if (!ownershipCheck.isValid) {
            res.status(403).json(ownershipCheck.message);
        }
        const updatedData = req.body;
        await db.collection(BARBERSHOPS_COLLECTION).doc(barberShopId).update(updatedData);
        res.status(200).json(updatedData)
    } catch (error) {
        console.error('Error in update_barbershop:', error);
        res.status(500).json('Internal server error');
    }
});

router.get('/get-reviews', verifyAccessToken, checkUserRole(['Barber']), async (req, res) => {
    try {
        const barberShopId = req.query.barberShopId;
        const barberId = req.userId;
        const ownershipCheck = await checkBarbershopOwnership(barberShopId, barberId);
        if (!ownershipCheck.isValid) {
            return res.status(403).json(ownershipCheck.message);
        }
        const reviewsSnapshot = await db.collection(REVIEWS_COLLECTION)
            .where('barberShopId', '==', barberShopId)
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

router.get('/get-closest-booking', verifyAccessToken, checkUserRole(['Barber']), async (req, res) => {
    try {
        const barberId = req.userId;
        const barbershopsSnapshot = await db.collection(BARBERSHOPS_COLLECTION)
            .where('barberId', '==', barberId)
            .get();
        if (barbershopsSnapshot.empty) {
            return res.status(404).json('No barbershops found for the barber');
        }
        let closestBooking = null;
        let closestbarberShopId = null;
        let upcomingBookingSnapshot = null;
        for (const barbershopDoc of barbershopsSnapshot.docs) {
            const barberShopId = barbershopDoc.id;
            const ownershipCheck = await checkBarbershopOwnership(barberShopId, barberId);
            if (!ownershipCheck.isValid) {
                return res.status(403).json(ownershipCheck.message);
            }
            const currentBookingSnapshot = await db.collection(BOOKING_COLLECTION)
                .where('barberShopId', '==', barberShopId)
                .where('date', '>=', moment().format(DATE_FORMAT))
                .orderBy('date')
                .limit(1)
                .get();
            if (!currentBookingSnapshot.empty) {
                const bookingData = currentBookingSnapshot.docs[0].data();
                const bookingDate = moment(bookingData.date, DATE_FORMAT);

                if (!closestBooking || bookingDate.isBefore(moment(closestBooking.date, DATE_FORMAT))) {
                    closestBooking = bookingData;
                    closestbarberShopId = barberShopId;
                    upcomingBookingSnapshot = currentBookingSnapshot;
                }
            }
        }
        if (!closestBooking) {
            return res.status(404).json('No upcoming bookings found for the barber');
        }

        const closestBookingWithId = Object.assign({}, {
            "barberShopId": closestbarberShopId,
            "bookingId": upcomingBookingSnapshot.docs[0].id
        }, closestBooking);
        return res.status(200).json(closestBookingWithId)
    } catch (error) {
        console.error(error);
        return res.status(500).json('Internal server error');
    }
});


router.get('/my-bookings', verifyAccessToken, checkUserRole(['Barber']), async (req, res) => {
    try {
        const barberId = req.userId;
        const barberShopId = req.query.barberShopId;
        const ownershipCheck = await checkBarbershopOwnership(barberShopId, barberId);
        if (!ownershipCheck.isValid) {
            return res.status(403).json(ownershipCheck.message);
        }
        const bookingSnapshot = await db.collection(BOOKING_COLLECTION)
            .where("barberShopId", "==", barberShopId)
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

router.delete('/delete-booking', verifyAccessToken, checkUserRole(['Barber']), async (req, res) => {
    try {
        const barberId = req.userId;
        const barberShopId = req.query.barberShopId;
        const bookingId = req.query.bookingId;

        const ownershipCheck = await checkBarbershopOwnership(barberShopId, barberId);
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


const checkBarbershopOwnership = async (barberShopId, barberId) => {
    try {
        if (!barberShopId) {
            return {isValid: false, message: 'Please provide a valid barbershop ID'};
        }
        const barbershopDoc = await db.collection(BARBERSHOPS_COLLECTION).doc(barberShopId).get();
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

router.post('/create-service', verifyAccessToken, checkUserRole(['Barber']), async (req, res) => {
    try {
        const barberId = req.userId;
        const barberShopId = req.query.barberShopId;
        const ownershipCheck = await checkBarbershopOwnership(barberShopId, barberId);
        if (!ownershipCheck.isValid) {
            return res.status(403).json(ownershipCheck.message);
        }
        const serviceData = new ServiceDTO({
            serviceName: req.body.serviceName,
            price: req.body.price,
            duration: req.body.duration,
            barberShopId: barberShopId,
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

router.delete('/delete-service', verifyAccessToken, checkUserRole(['Barber']), async (req, res) => {
    try {
        const barberId = req.userId;
        const barberShopId = req.query.barberShopId;
        const serviceId = req.query.serviceId;
        const ownershipCheck = await checkBarbershopOwnership(barberShopId, barberId);
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

router.put('/update-service', verifyAccessToken, checkUserRole(['Barber']), async (req, res) => {
    try {
        const barberId = req.userId;
        const barberShopId = req.query.barberShopId;
        const serviceId = req.query.serviceId;
        const ownershipCheck = await checkBarbershopOwnership(barberShopId, barberId);
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

router.get('/get-services', verifyAccessToken, checkUserRole(['Barber']), async (req, res) => {
    try {
        const barberShopId = req.query.barberShopId;

        const servicesSnapshot = await db.collection(SERVICES_COLLECTION)
            .where('barberShopId', '==', barberShopId)
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