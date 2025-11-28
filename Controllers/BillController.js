const Bill = require("../Models/BillSchema");
const event = require("../Models/EventSchema");
const { createNotification } = require("./notificationController");

// ===============Create a Bill ===============
exports.createBill = async (req, res) => {
  try {
    const newBill = new Bill(req.body);
    console.log(req.body);

    // Check if this is an event-based or agreement-based bill
    if (req.body.eventId) {
      // Legacy event-based bill
      const associatedEvent = await event.findById(req.body.eventId);
      if (!associatedEvent) {
        return res.status(404).json({ message: "Associated event not found" });
      }
      associatedEvent.status = "completed";
      associatedEvent.price = req.body.amount;
      await associatedEvent.save();
    }
    // For agreement-based bills, we don't need to update event status
    // The agreement status is already handled in the agreement controller

    // Send notifications
    await createNotification(
      req.body.officiantId,
      "bill",
      `Payment received from ${req.body.userName} on ${req.body.eventName}.`
    );
    await createNotification(
      req.body.userId,
      "bill",
      `Payment made to ${req.body.officiantName} on ${req.body.eventName}.`
    );

    await newBill.save();
    res
      .status(201)
      .json({ message: "Bill created successfully", bill: newBill });
  } catch (error) {
    console.error("Error creating bill:", error);
    res
      .status(500)
      .json({ message: "Error creating bill", error: error.message });
  }
};
// ===============Get All Bills ===============
exports.getAllBills = async (req, res) => {
  try {
    const bills = await Bill.find();
    res.status(200).json({ message: "Bills retrieved successfully", bills });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving bills", error });
  }
};

// ===============Get Bill by ID (EventId or AgreementId) ===============
exports.getBillById = async (req, res) => {
  try {
    console.log("Fetching bill with ID:", req.params.id);
    // Try to find by eventId first (legacy), then by agreementId
    let bill = await Bill.findOne({ eventId: req.params.id.toString() });
    if (!bill) {
      bill = await Bill.findOne({ agreementId: req.params.id.toString() });
    }
    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }
    res.status(200).json({ message: "Bill retrieved successfully", bill });
  } catch (error) {
    console.error("Error retrieving bill:", error);
    res
      .status(500)
      .json({ message: "Error retrieving bill", error: error.message });
  }
};

// ===============Get Bills by User ID ===============
exports.getBillsByUserId = async (req, res) => {
  try {
    console.log("Fetching bills for user:", req.params.userId);
    const bills = await Bill.find({
      userId: req.params.userId.toString(),
    }).sort({ createdAt: -1 });
    res.status(200).json({ message: "Bills retrieved successfully", bills });
  } catch (error) {
    console.error("Error retrieving bills:", error);
    res
      .status(500)
      .json({ message: "Error retrieving bills", error: error.message });
  }
};

// ===============Update Bill Status ===============
exports.updateBillStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const bill = await Bill.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }
    res.status(200).json({ message: "Bill status updated successfully", bill });
  } catch (error) {
    res.status(500).json({ message: "Error updating bill status", error });
  }
};
