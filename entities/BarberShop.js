class BarberShopDTO {
    constructor(_id, barbershop_name, phone_number, opening_days, opening_hours, services, reviews, total_rating) {
        this._id = _id
        this.barbershop_name = barbershop_name
        this.phone_number = phone_number
        this.opening_days = opening_hours
        this.services = services
        this.reviews = reviews
        this.toal_rating = total_rating
    }
}

module.exports = BarberShopDTO;
