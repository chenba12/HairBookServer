class BarberDTO {
    constructor({email, first_name, last_name,years_of_experience, barber_shops}) {
        this.email=email
        this.first_name = first_name
        this.last_name = last_name
        this.years_of_experience=years_of_experience
        this.barber_shops = barber_shops
    }
}

module.exports = BarberDTO;
