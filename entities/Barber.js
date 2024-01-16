class BarberDTO {
    constructor({_id,email, first_name, last_name, barber_shops}) {
        this.email=email
        this.first_name = first_name
        this.last_name = last_name
        this.barber_shops = barber_shops
    }
}

module.exports = BarberDTO;
