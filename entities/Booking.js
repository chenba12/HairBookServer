class BookingDTO {
    constructor({service, date, _user_id, _barbershop_id}) {
        this.service = service
        this.date = date
        this._user_id = _user_id
        this._barbershop_id = _barbershop_id
    }
}

module.exports = BookingDTO;
