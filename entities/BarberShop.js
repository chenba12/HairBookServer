class BarberShopDTO {
    constructor({
                    barbershop_name,
                    phone_number,
                    working_days,
                    sunday_hours,
                    monday_hours,
                    tuesday_hours,
                    wednesday_hours,
                    thursday_hours,
                    friday_hours,
                    saturday_hours,
                    services,
                    reviews,
                    total_rating,
                    location,
                    _barber_id
                }) {
        this.barbershop_name = barbershop_name
        this.phone_number = phone_number
        this.working_days = working_days
        this.sunday_hours = sunday_hours
        this.monday_hours = monday_hours
        this.tuesday_hours = tuesday_hours
        this.wednesday_hours = wednesday_hours
        this.thursday_hours = thursday_hours
        this.friday_hours = friday_hours
        this.saturday_hours = saturday_hours
        this.services = services
        this.reviews = reviews
        this.toal_rating = total_rating
        this.location = location
        this._barber_id = _barber_id
    }
}

module.exports = BarberShopDTO;
