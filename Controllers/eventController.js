const event = require("../Models/EventSchema");
const User = require("../Models/UserCredential");
const Agreement = require("../Models/AgreementSchema");
const nodemailer = require("nodemailer");
const { createNotification } = require("./notificationController");
// create event
exports.createEvent = async (req, res) => {
  try {
    const { title, description, userId, officiantId } = req.body;
    if (!title || !description || !userId) {
      return res.status(400).json({
        error:
          "Missing required fields: title, description, and userId are required",
      });
    }

    // Get the agreement to fetch pricing information
    let eventPrice = req.body.price || 0;
    if (userId) {
      const agreement = await Agreement.findOne({
        userId,
        status: "officiant_signed",
      });
      if (agreement) {
        // Apply agreement price (base price + travel fee) to the event
        eventPrice = (agreement.price || 0) + (agreement.travelFee || 0);
      } else {
        console.log("No valid agreement found for userId:", userId);
        return res.status(400).json({
          error:
            "No valid agreement found. Please ensure an agreement is signed by the officiant before submitting a ceremony.",
        });
      }
    }

    const newEvent = new event({
      ...req.body,
      price: eventPrice,
    });
    const savedEvent = await newEvent.save();

    // If ceremony is submitted, reset AgreementAccepted to false and mark agreement as used
    if (savedEvent.status === "submitted") {
      console.log("Ceremony submitted, updating user and agreement...");
      console.log("UserId:", userId, "OfficiantId:", officiantId);

      await User.findByIdAndUpdate(userId, { AgreementAccepted: false });

      // Mark the agreement as used for ceremony
      if (userId) {
        const agreementUpdate = await Agreement.findOneAndUpdate(
          { userId },
          {
            isUsedForCeremony: true,
            ceremonySubmittedAt: new Date(),
            status: "used",
          },
          { new: true }
        );
        console.log(
          "Agreement updated:",
          agreementUpdate ? "Success" : "Not found"
        );
        if (!agreementUpdate) {
          return res.status(400).json({
            error:
              "No valid agreement found to update. Please ensure an agreement exists before submitting a ceremony.",
          });
        }
      } else {
        console.log("No officiantId provided, skipping agreement update");
      }

      createNotification(
        savedEvent.officiantId,
        "Ceremony",
        `New Ceremony "${savedEvent.title}" has been submitted.`
      );
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
    const events = await event.find({
      userId,
      officiantId,
      status: { $eq: "submitted" },
    });
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
    // Get the event before updating to check status change
    const existingEvent = await event.findById(eventId);
    if (!existingEvent) {
      return res.status(404).json({ error: "Event not found" });
    }

    // If updating to submitted status, apply agreement pricing
    if (
      updates.status === "submitted" &&
      existingEvent.status !== "submitted"
    ) {
      const agreement = await Agreement.findOne({
        userId: existingEvent.userId,
        officiantId: existingEvent.officiantId,
      });
      if (agreement) {
        // Apply agreement price (base price + travel fee) to the event
        updates.price = (agreement.price || 0) + (agreement.travelFee || 0);
      }
    }

    const updatedEvent = await event.findByIdAndUpdate(eventId, updates, {
      new: true,
      runValidators: true,
    });

    // If ceremony is submitted, reset AgreementAccepted to false
    if (
      updatedEvent.status === "submitted" &&
      existingEvent.status !== "submitted"
    ) {
      console.log(
        "Ceremony updated to submitted, updating user and agreement..."
      );
      console.log(
        "UserId:",
        updatedEvent.userId,
        "OfficiantId:",
        updatedEvent.officiantId
      );

      await User.findByIdAndUpdate(updatedEvent.userId, {
        AgreementAccepted: false,
      });

      // Mark the agreement as used for ceremony
      if (updatedEvent.officiantId) {
        const agreementUpdate = await Agreement.findOneAndUpdate(
          {
            userId: updatedEvent.userId,
            officiantId: updatedEvent.officiantId,
          },
          {
            isUsedForCeremony: true,
            ceremonySubmittedAt: new Date(),
            status: "used",
          },
          { new: true }
        );
        console.log(
          "Agreement updated:",
          agreementUpdate ? "Success" : "Not found"
        );
      } else {
        console.log("No officiantId in ceremony, skipping agreement update");
      }

      createNotification(
        updatedEvent.officiantId,
        "Ceremony",
        `Ceremony "${updatedEvent.title}" has been submitted.`
      );
    }

    if (updatedEvent.status === "completed") {
      createNotification(
        updatedEvent.userId,
        "Ceremony",
        `Your Ceremony "${updatedEvent.title}" has been marked as completed.`
      );
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
    if (deletedEvent) {
      createNotification(
        deletedEvent.userId,
        "Ceremony",
        `Your Ceremony "${deletedEvent.title}" has been deleted.`
      );
      createNotification(
        deletedEvent.officiantId,
        "Ceremony",
        `The Ceremony "${deletedEvent.title}" has been deleted from the system.`
      );
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

// Assign officiant to event
exports.assignOfficiant = async (req, res) => {
  const { eventId } = req.params;
  const { officiantId, officiantName } = req.body;

  try {
    // Validate input
    if (!officiantId || !officiantName) {
      return res.status(400).json({
        error:
          "Missing required fields: officiantId and officiantName are required",
      });
    }

    // Find the event
    const foundEvent = await event.findById(eventId);
    if (!foundEvent) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Check if officiant exists and is available
    const officiant = await User.findById(officiantId);
    if (!officiant) {
      return res.status(404).json({ error: "Officiant not found" });
    }

    if (officiant.role !== "officiant") {
      return res
        .status(400)
        .json({ error: "Selected user is not an officiant" });
    }

    if (!officiant.availability) {
      return res.status(400).json({
        error:
          "Officiant is currently not available. Please select another officiant.",
      });
    }

    // Update event with officiant details
    foundEvent.officiantId = officiantId;
    foundEvent.officiantName = officiantName;
    await foundEvent.save();

    // Update user's currentOfficiant field to keep in sync
    const user = await User.findById(foundEvent.userId);
    if (user) {
      user.currentOfficiant = {
        officiantId,
        officiantName,
        assignedAt: new Date(),
      };
      await user.save();
      console.log(`✓ Updated user's currentOfficiant: ${officiantName}`);
    }

    // Create notification for officiant
    createNotification(
      officiantId,
      "Event Assignment",
      `You have been assigned to event: "${foundEvent.title}" scheduled for ${
        foundEvent.eventDate
          ? new Date(foundEvent.eventDate).toLocaleDateString('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'long', day: 'numeric' })
          : "TBD"
      }`
    );

    // Create notification for user
    if (foundEvent.userId) {
      createNotification(
        foundEvent.userId,
        "Event Update",
        `${officiantName} has been assigned as the officiant for your event: "${foundEvent.title}"`
      );
    }

    // Send email notification to officiant
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const emailHtml = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Event Assignment</title>
          </head>
          <body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#f7f9fc;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f7f9fc; padding:40px 0;">
              <tr>
                <td align="center">
                  <table width="600" border="0" cellspacing="0" cellpadding="0" style="background:#ffffff; border-radius:12px; box-shadow:0 6px 20px rgba(0,0,0,0.1);">
                    
                    <!-- Header -->
                    <tr>
                      <td style="background:linear-gradient(90deg, #ffb347, #ffcc33); padding:25px; border-radius:12px 12px 0 0; text-align:center;">
                        <h1 style="margin:0; font-size:26px; color:#ffffff; font-weight:bold;">ERIE WEDDING OFFICIANTS</h1>
                        <p style="margin:8px 0 0 0; color:#ffffff; font-size:14px; opacity:0.9;">New Event Assignment</p>
                      </td>
                    </tr>

                    <!-- Icon -->
                    <tr>
                      <td style="text-align:center; padding:30px 30px 20px 30px;">
                        <div style="width:60px; height:60px; background:linear-gradient(90deg, #4CAF50, #45a049); border-radius:50%; margin:0 auto; display:flex; align-items:center; justify-content:center;">
                          <span style="color:white; font-size:28px;">📅</span>
                        </div>
                      </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                      <td style="padding:0 30px 30px 30px; text-align:left; color:#333333;">
                        <h2 style="color:#4CAF50; margin:0 0 20px 0; font-size:22px; text-align:center;">
                          You've Been Assigned to a New Event
                        </h2>
                        
                        <p style="font-size:16px; line-height:1.6; color:#555555; margin:0 0 20px 0;">
                          Dear ${officiantName},
                        </p>

                        <p style="font-size:16px; line-height:1.6; color:#555555; margin:0 0 20px 0;">
                          You have been assigned to officiate the following event:
                        </p>

                        <div style="background:#f8f9fa; border-left:4px solid #4CAF50; padding:20px; margin:20px 0; border-radius:0 8px 8px 0;">
                          <p style="margin:0 0 10px 0; font-size:16px; color:#333; font-weight:bold;">
                            Event: ${foundEvent.title}
                          </p>
                          ${
                            foundEvent.eventDate
                              ? `<p style="margin:0 0 10px 0; font-size:14px; color:#666;">
                                <strong>Date:</strong> ${new Date(
                                  foundEvent.eventDate
                                ).toLocaleDateString('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'long', day: 'numeric' })}
                              </p>`
                              : ""
                          }
                          ${
                            foundEvent.eventTime
                              ? `<p style="margin:0 0 10px 0; font-size:14px; color:#666;">
                                <strong>Time:</strong> ${new Date(
                                  foundEvent.eventTime
                                ).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', hour12: true })}
                              </p>`
                              : ""
                          }
                          ${
                            foundEvent.location
                              ? `<p style="margin:0 0 10px 0; font-size:14px; color:#666;">
                                <strong>Location:</strong> ${foundEvent.location}
                              </p>`
                              : ""
                          }
                          ${
                            foundEvent.description
                              ? `<p style="margin:10px 0 0 0; font-size:14px; color:#666;">
                                <strong>Description:</strong> ${foundEvent.description}
                              </p>`
                              : ""
                          }
                        </div>

                        <!-- CTA Button -->
                        <div style="text-align:center; margin:30px 0;">
                          <a href="${
                            process.env.FRONTEND_URL
                          }/dashboard" target="_blank" style="background:linear-gradient(90deg, #4CAF50, #45a049); color:#ffffff; text-decoration:none; padding:16px 32px; border-radius:30px; font-size:16px; font-weight:bold; display:inline-block; box-shadow:0 4px 15px rgba(0,0,0,0.2);">
                            View Event Details
                          </a>
                        </div>

                        <p style="font-size:14px; line-height:1.6; color:#666; text-align:center; margin:20px 0 0 0;">
                          Please log in to your dashboard to review the event details and prepare for the ceremony.
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="background:#f8f9fa; text-align:center; padding:25px; border-radius:0 0 12px 12px; border-top:1px solid #eee;">
                        <p style="margin:0 0 10px 0; font-size:14px; color:#666;">
                          Thank you for being part of Erie Wedding Officiants
                        </p>
                        <p style="margin:0; font-size:12px; color:#999999;">
                          © ${new Date().getFullYear()} Erie Wedding Officiants. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `;

      const mailOptions = {
        from: `"Erie Wedding Officiants" <${process.env.EMAIL_USER}>`,
        to: officiant.email,
        subject: `New Event Assignment: ${foundEvent.title} - Erie Wedding Officiants`,
        html: emailHtml,
      };

      await transporter.sendMail(mailOptions);
      console.log(`📧 Event assignment email sent to ${officiant.email}`);
    } catch (emailError) {
      console.error("Error sending assignment email:", emailError);
      // Don't fail the request if email fails
    }

    res.status(200).json({
      msg: "Officiant assigned successfully",
      event: foundEvent,
    });
  } catch (err) {
    console.error("Error assigning officiant:", err);
    res.status(500).json({ error: err.message });
  }
};
