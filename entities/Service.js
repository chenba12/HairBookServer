class ServiceDTO {
    constructor({serviceName, price, barbershopId}) {
        this.serviceName = serviceName
        this.price = price
        this.barbershopId = barbershopId
    }
}

module.exports = ServiceDTO;
