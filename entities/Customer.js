class CustomerDTO {
    constructor({first_name, last_name, age, phone_number, my_booking, my_reviews}) {
        this.first_name = first_name
        this.last_name = last_name
        this.age = age
        this.phone_number = phone_number
    }
}

module.exports = CustomerDTO;
