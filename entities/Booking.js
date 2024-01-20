class BookingDTO {
    constructor({service, date, userId, barbershopId}) {
        this.service = service
        this.date = date
        this.userId = userId
        this.barbershopId = barbershopId
    }
}

module.exports = BookingDTO;
