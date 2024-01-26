class BookingDTO {
    constructor({serviceId, date, userId, barberShopId, barberShopName, barberName, customerName}) {
        this.serviceId = serviceId
        this.date = date
        this.userId = userId
        this.barberShopId = barberShopId
        this.barberShopName = barberShopName
        this.barberName = barberName
        this.customerName = customerName
    }
}

module.exports = BookingDTO;
