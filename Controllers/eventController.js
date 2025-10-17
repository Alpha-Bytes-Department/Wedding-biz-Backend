const event = require("../Models/EventSchema");
const {createNotification}=require('./notificationController')
// create event
exports.createEvent = async (req, res) => {
  try {
    const { title, description, ceremonyType, userId } = req.body;
    if (!title || !description || !ceremonyType || !userId) {
      return res.status(400).json({
        error:
          "Missing required fields: title, description, ceremonyType, and userId are required",
      });
    }
    const newEvent = new event(req.body);
    const savedEvent = await newEvent.save();
    if(savedEvent.status === 'submitted'){
      createNotification(savedEvent.officiantId, 'Ceremony', `New Ceremony "${savedEvent.title}" has been submitted.` );
    }
    res.status(201).json({
      msg: "Event created successfully",
      event: savedEvent,
    });
  } catch (err) {
    console.error("Error creating event:", err);
    res.status(500).json({ error: err.message });
  }
};

// get event by user and officiant id
exports.getEventsByUserAndOfficiant = async (req, res) => {
  const { userId, officiantId } = req.params;
  try {
    const events = await event.find({ userId, officiantId ,status: { $eq: 'submitted' }});
    console.log("Fetched events:", events.length);
    res.status(200).json({ events });
  } catch (err) {
    console.error("Error fetching events:", err);
    res.status(500).json({ error: err.message });
  }
};

// Update event
exports.updateEvent = async (req, res) => {
  const eventId = req.params.id;
  const updates = req.body;
  try {
    const updatedEvent = await event.findByIdAndUpdate(eventId, updates, {
      new: true,
      runValidators: true,
    });
    if(updatedEvent.status === 'completed'){
      createNotification(updatedEvent.userId, 'Ceremony', `Your Ceremony "${updatedEvent.title}" has been marked as completed.` );
    }
    if (!updatedEvent) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.status(200).json({ msg: "Event updated successfully", updatedEvent });
  } catch (err) {
    console.error("Error updating event:", err);
    res.status(500).json({ error: err.message });
  } 
};

// delete event
exports.deleteEvent = async (req, res) => {
  const eventId = req.params.id;
  try {
    const deletedEvent = await event.findByIdAndDelete(eventId);
    if(deletedEvent){
      createNotification(deletedEvent.userId, 'Ceremony', `Your Ceremony "${deletedEvent.title}" has been deleted.` );
      createNotification(deletedEvent.officiantId, 'Ceremony', `The Ceremony "${deletedEvent.title}" has been deleted from the system.` );
    }
    if (!deletedEvent) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.status(200).json({ msg: "Event deleted successfully" });
  } catch (err) {
    console.error("Error deleting event:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get all events
exports.getAllEvents = async (req, res) => {
  try {
    const events = await event.find();
    res.status(200).json({ events });
  } catch (err) {
    console.error("Error fetching events:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get events by role and id
exports.getEventsByRole = async (req, res) => {
  const { id, role } = req.params;
  try {
    let query = {};
    if (role === "officiant") {
      query.officiantId = id;
    } else {
      query.userId = id;
    }
    const events = await event.find(query);
    res.status(200).json({ events });
  } catch (err) {
    console.error("Error fetching events by role:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get single event by id
exports.getEventById = async (req, res) => {
  const eventId = req.params.id;
  try {
    const foundEvent = await event.findById(eventId);
    if (!foundEvent) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.status(200).json({ event: foundEvent });
  } catch (err) {
    console.error("Error fetching event by id:", err);
    res.status(500).json({ error: err.message });
  }
};