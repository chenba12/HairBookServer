class BookingDTO {
    constructor({date, time, _user_id, _barber_id, _barbershop_id}) {
        this.date = date
        this.time = time
        this._user_id = _user_id
        this._barber_id = _barber_id
        this._barbershop_id = _barbershop_id
    }
}

module.exports = BookingDTO;
