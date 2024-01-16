class ServiceDTO {
    constructor({service_name,price, _barbershop_id}) {
        this.service_name=service_name
        this.price=price
        this._barbershop_id = _barbershop_id
    }
}

module.exports = ServiceDTO;
