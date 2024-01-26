class ReviewDTO {
    constructor({firstName, lastName, review, rating, timestamp, userId, barberShopId}) {
        this.firstName = firstName
        this.lastName = lastName
        this.review = review
        this.rating = rating
        this.timestamp = timestamp
        this.userId = userId
        this.barberShopId = barberShopId
    }
}

module.exports = ReviewDTO;
