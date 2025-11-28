const express = require("express");

const auth = require("../Middleware/authMiddleware");
const {
  createEvent,
  updateEvent,
  deleteEvent,
  getEventsByRole,
  getAllEvents,
  getEventsByUserAndOfficiant,
  getEventById,
  assignOfficiant,
} = require("../Controllers/eventController");
// const { deleteUser } = require("../Controllers/UserController");

const router = express.Router();

// create event
router.post("/create", auth, createEvent);

// Update event
router.patch("/update/:id", auth, updateEvent);

// delete event
router.delete("/delete/:id", auth, deleteEvent);

// get event by user and officiant id
router.get(
  "/officiant-Client/:userId/:officiantId",
  auth,
  getEventsByUserAndOfficiant
);

// get event by user or officiant id
router.get("/by-role/:id/:role", auth, getEventsByRole);

// get single event by id
router.get("/:id", auth, getEventById);

// assign officiant to event (admin only)
router.post("/assign-officiant/:eventId", auth, assignOfficiant);

// get all events
router.get("/officiantAccess/all", auth, getAllEvents);

module.exports = router;
