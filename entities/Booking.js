class BookingDTO {
    constructor({service, date, userId, barbershopId, barberShopName, barberName, customerName}) {
        this.service = service
        this.date = date
        this.userId = userId
        this.barbershopId = barbershopId
        this.barberShopName = barberShopName
        this.barberName = barberName
        this.customerName = customerName
    }
}

module.exports = BookingDTO;
