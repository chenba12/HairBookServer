class ServiceDTO {
    constructor({serviceName, price, duration, barberShopId}) {
        this.serviceName = serviceName
        this.price = price
        this.duration = duration
        this.barberShopId = barberShopId
    }
}

module.exports = ServiceDTO;
