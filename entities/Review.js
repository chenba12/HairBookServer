class ReviewDTO {
    constructor({firstName, lastName, review, rating, timestamp, userId, barbershopId}) {
        this.firstName = firstName
        this.lastName = lastName
        this.review = review
        this.rating = rating
        this.timestamp = timestamp
        this.userId = userId
        this.barbershopId = barbershopId
    }
}

module.exports = ReviewDTO;
