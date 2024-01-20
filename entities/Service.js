class ServiceDTO {
    constructor({serviceName, price, duration, barbershopId}) {
        this.serviceName = serviceName
        this.price = price
        this.duration = duration
        this.barbershopId = barbershopId
    }
}

module.exports = ServiceDTO;
