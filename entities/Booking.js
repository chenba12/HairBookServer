class BookingDTO {
    constructor({service, date, userId, barberShopId, barberShopName, barberName, customerName}) {
        this.service = service
        this.date = date
        this.userId = userId
        this.barberShopId = barberShopId
        this.barberShopName = barberShopName
        this.barberName = barberName
        this.customerName = customerName
    }
}

module.exports = BookingDTO;
