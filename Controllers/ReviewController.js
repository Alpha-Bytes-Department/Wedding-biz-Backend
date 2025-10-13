const review = require("./../Models/Review");
const { createNotification } = require("./notificationController");

// Create a riview for an event
exports.createReview = async (req, res) => {
  try {
    const {
      userId,
      userImageUrl,
      userName,
      rating,
      eventId,
      ratingDescription,
      officiantId,
      eventName,
    } = req.body;
    if (
      !userId ||
      !userImageUrl ||
      !userName ||
      !rating ||
      !eventId ||
      !officiantId ||
      !eventName
    ) {
      const missingFields = [];
      if (!userId) missingFields.push("userId");
      if (!userImageUrl) missingFields.push("userImageUrl");
      if (!userName) missingFields.push("userName");
      if (!rating) missingFields.push("rating");
      if (!eventId) missingFields.push("eventId");
      if (!officiantId) missingFields.push("officiantId");
      if (!eventName) missingFields.push("eventName");

      return res
        .status(400)
        .json({ msg: `Missing required fields: ${missingFields.join(", ")}` });
    }
    const newReview = new review({
      userId,
      userImageUrl,
      userName,
      rating,
      eventId,
      ratingDescription,
      officiantId,
      eventName,
    });
    await newReview.save();
    console.log(
      `You got a new review for ${eventName} from ${userName} userId: ${userId}`
    );
    await createNotification(
      officiantId,
      "review_created",
      `You got a new review for ${eventName} from ${userName} userId: ${userId}`
    );
    res
      .status(201)
      .json({ msg: "Review created successfully", review: newReview });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// get reviews for officiants
exports.getReviewsForOfficiant = async (req, res) => {
  try {
    const { officiantId } = req.params;
    if (!officiantId) {
      return res.status(400).json({ msg: "Officiant ID is required" });
    }
    const reviews = await review.find({ officiantId });
    res.status(200).json({ reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// update review visibility
exports.updateReviewVisibility = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { isVisible } = req.body;
    console.log("Updating review visibility:", { reviewId, isVisible });
    if (isVisible === undefined) {
      return res.status(400).json({ msg: "Visibility status is required" });
    }
    const updatedReview = await review.findByIdAndUpdate(
      reviewId,
      { isVisible },
      { new: true, runValidators: true }
    );
    if (!updatedReview) {
      return res.status(404).json({ msg: "Review not found" });
    }
    res
      .status(200)
      .json({
        msg: "Review visibility updated successfully",
        review: updatedReview,
      });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Show reviews publicly based on visibility
exports.getPublicReviews = async (req, res) => {
  try {
    let reviews = await review.find({ isVisible: true });

    if (reviews.length === 0) {
      // Create dummy review data if no reviews exist
      const dummyReviews = [
        {
          userId: "dummy1",
          userImageUrl:
            "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150",
          userName: "Sarah Johnson",
          rating: 5,
          eventId: "event1",
          ratingDescription:
            "Absolutely amazing! Our officiant made our special day even more magical. They were professional, warm, and truly understood what we wanted for our ceremony. Couldn't have asked for better!",
          officiantId: "officiant1",
          eventName: "Sarah & Michael's Wedding",
          isVisible: true,
          createdAt: new Date("2024-01-15"),
        },
        {
          userId: "dummy2",
          userImageUrl:
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
          userName: "David Chen",
          rating: 5,
          eventId: "event2",
          ratingDescription:
            "We were so nervous about finding the right officiant, but this was the best decision we made! They listened to our story and created a ceremony that was uniquely ours. Our guests are still talking about how beautiful it was.",
          officiantId: "officiant1",
          eventName: "Emma & David's Garden Wedding",
          isVisible: true,
          createdAt: new Date("2024-02-03"),
        },
        {
          userId: "dummy3",
          userImageUrl:
            "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
          userName: "Maria Rodriguez",
          rating: 4,
          eventId: "event3",
          ratingDescription:
            "Such a lovely experience! Our officiant was punctual, well-prepared, and brought such positive energy to our ceremony. They made us feel comfortable and helped everything flow smoothly. Highly recommend!",
          officiantId: "officiant2",
          eventName: "Maria & James' Beach Wedding",
          isVisible: true,
          createdAt: new Date("2024-02-20"),
        },
        {
          userId: "dummy4",
          userImageUrl:
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
          userName: "Robert Thompson",
          rating: 5,
          eventId: "event4",
          ratingDescription:
            "From our first meeting to the wedding day, everything was perfect! They took the time to get to know us as a couple and delivered a ceremony that truly reflected our love story. Professional, caring, and talented!",
          officiantId: "officiant2",
          eventName: "Lisa & Robert's Rustic Wedding",
          isVisible: true,
          createdAt: new Date("2024-03-10"),
        },
      ];
      reviews = dummyReviews;
    }
    // console.log("Public reviews fetched:", reviews.length);
    res.status(200).json({ reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// get public reviews of an officiant
exports.getPublicReviewsForOfficiant = async (req, res) => {
  try {
    const { officiantId } = req.params;
    const reviews = await review.find({ officiantId, isVisible: true });
    res.status(200).json({ reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
