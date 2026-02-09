const Agreement = require("../Models/AgreementSchema");
const Event = require("../Models/EventSchema");
const User = require("../Models/UserCredential");
const { createNotification } = require("./notificationController");
const nodemailer = require("nodemailer");

// Create Agreement (Officiant creates from scratch)
exports.createAgreement = async (req, res) => {
  try {
    const {
      officiantName,
      eventDate,
      partner1Name,
      partner2Name,
      location,
      price,
      travelFee,
      userId,
    } = req.body;
    const officiantId = req.user.id;
    // Get from authenticated user

    // Create agreement with officiant's data
    const newAgreement = new Agreement({
      userId,
      officiantId,
      officiantName,
      eventDate,
      partner1Name,
      partner2Name,
      location,
      price,
      travelFee: travelFee || 0,
      status: "officiant_filled", // Changed to officiant_filled when created with details
    });

    await newAgreement.save();

    // Notify user that agreement is ready
    if (userId) {
      await createNotification(
        userId,
        "agreement",
        "Your officiant has created a ceremony agreement. Please review and sign."
      );

      // Send email notification
      try {
        const user = await User.findById(userId);
        if (user && user.email) {
          const transporter = nodemailer.createTransporter({
            service: "gmail",
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
          });

          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: "New Wedding Agreement - Erie Wedding Officiants",
            html: `
              <h2>Your Wedding Agreement is Ready</h2>
              <p>Hello ${user.name || partner1Name},</p>
              <p>Your officiant has created a ceremony agreement for you. Please log in to review and sign.</p>
              <p><strong>Agreement Details:</strong></p>
              <ul>
                <li>Partners: ${partner1Name} & ${partner2Name}</li>
                <li>Date: ${new Date(eventDate).toLocaleDateString('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'long', day: 'numeric' })}</li>
                <li>Location: ${location}</li>
                <li>Ceremony Fee: $${price.toFixed(2)}</li>
                ${ 
                  travelFee > 0
                    ? `<li>Travel Fee: $${travelFee.toFixed(2)}</li>`
                    : ""
                }
                <li>Total: $${(price + (travelFee || 0)).toFixed(2)}</li>
              </ul>
              <p>Please log in to your account to review and sign the agreement.</p>
              <p>Best regards,<br>Erie Wedding Officiants</p>
            `,
          });
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }
    }

    res.status(201).json({
      message: "Agreement created successfully",
      agreement: newAgreement,
    });
  } catch (error) {
    console.error("Error creating agreement:", error);
    res
      .status(500)
      .json({ message: "Error creating agreement", error: error.message });
  }
};

// Get Agreement by User ID (for both user and officiant)
exports.getAgreementByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log("Requester ID:", userId);
    // Find agreement where user is either the client or the officiant
    const agreement = await Agreement.findOne({
      userId,
    });
    console.log("Fetched agreement:", agreement);

    if (!agreement) {
      return res.status(404).json({ message: "Agreement not found" });
    }

    res.status(200).json({
      message: "Agreement retrieved successfully",
      agreement,
    });
  } catch (error) {
    console.error("Error fetching agreement:", error);
    res
      .status(500)
      .json({ message: "Error fetching agreement", error: error.message });
  }
};

// Update Agreement Details (by Officiant)
exports.updateAgreementDetails = async (req, res) => {
  try {
    const { agreementId } = req.params;
    const {
      officiantName,
      eventDate,
      partner1Name,
      partner2Name,
      location,
      price,
      travelFee,
    } = req.body;

    const agreement = await Agreement.findById(agreementId);
    if (!agreement) {
      return res.status(404).json({ message: "Agreement not found" });
    }

    agreement.officiantName = officiantName || agreement.officiantName;
    agreement.eventDate = eventDate || agreement.eventDate;
    agreement.partner1Name = partner1Name || agreement.partner1Name;
    agreement.partner2Name = partner2Name || agreement.partner2Name;
    agreement.location = location || agreement.location;
    agreement.price = price !== undefined ? price : agreement.price;
    agreement.travelFee =
      travelFee !== undefined ? travelFee : agreement.travelFee;
    agreement.status = "officiant_filled";
    agreement.officiantFilledAt = new Date();
    agreement.updatedAt = new Date();

    await agreement.save();

    // Notify user
    await createNotification(
      agreement.userId,
      "agreement",
      "Officiant has filled the agreement details. Please review and sign."
    );

    res.status(200).json({
      message: "Agreement details updated successfully",
      agreement,
    });
  } catch (error) {
    console.error("Error updating agreement details:", error);
    res
      .status(500)
      .json({ message: "Error updating agreement", error: error.message });
  }
};

// Upload User Signatures
exports.uploadUserSignatures = async (req, res) => {
  try {
    const { agreementId } = req.params;

    if (!req.files || Object.keys(req.files).length < 2) {
      return res.status(400).json({
        message: "Both partner signatures are required",
      });
    }

    const agreement = await Agreement.findById(agreementId);
    if (!agreement) {
      return res.status(404).json({ message: "Agreement not found" });
    }

    const baseUrl =
      process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;

    // req.files is an object with fieldnames as keys
    if (req.files.partner1Signature && req.files.partner1Signature[0]) {
      agreement.partner1Signature = `${baseUrl}/uploads/signatures/${req.files.partner1Signature[0].filename}`;
    }
    if (req.files.partner2Signature && req.files.partner2Signature[0]) {
      agreement.partner2Signature = `${baseUrl}/uploads/signatures/${req.files.partner2Signature[0].filename}`;
    }

    agreement.status = "user_signed";
    agreement.userSignedAt = new Date();
    agreement.updatedAt = new Date();

    await agreement.save();

    // Notify officiant
    await createNotification(
      agreement.officiantId,
      "agreement",
      "Users have signed the agreement. You can now send payment request."
    );

    res.status(200).json({
      message: "Signatures uploaded successfully",
      agreement,
    });
  } catch (error) {
    console.error("Error uploading signatures:", error);
    res
      .status(500)
      .json({ message: "Error uploading signatures", error: error.message });
  }
};

// Send Payment Request (by Officiant)
exports.sendPaymentRequest = async (req, res) => {
  try {
    const { agreementId } = req.params;

    const agreement = await Agreement.findById(agreementId);
    if (!agreement) {
      return res.status(404).json({ message: "Agreement not found" });
    }

    if (agreement.status !== "user_signed") {
      return res
        .status(400)
        .json({ message: "Users must sign the agreement first" });
    }

    agreement.status = "payment_requested";
    agreement.paymentRequestedAt = new Date();
    agreement.updatedAt = new Date();

    await agreement.save();

    // Notify user
    await createNotification(
      agreement.userId,
      "payment",
      `Payment request sent for ${agreement.partner1Name} & ${
        agreement.partner2Name
      } ceremony. Amount: $${agreement.price + agreement.travelFee}`
    );

    res.status(200).json({
      message: "Payment request sent successfully",
      agreement,
    });
  } catch (error) {
    console.error("Error sending payment request:", error);
    res
      .status(500)
      .json({ message: "Error sending payment request", error: error.message });
  }
};

// Mark Payment as Completed
exports.markPaymentCompleted = async (req, res) => {
  try {
    const { agreementId } = req.params;

    const agreement = await Agreement.findById(agreementId);
    if (!agreement) {
      return res.status(404).json({ message: "Agreement not found" });
    }

    agreement.status = "payment_completed";
    agreement.paymentCompletedAt = new Date();
    agreement.updatedAt = new Date();

    await agreement.save();

    // Update user's AgreementAccepted status
    await User.findByIdAndUpdate(agreement.userId, { AgreementAccepted: true });

    // Notify officiant
    await createNotification(
      agreement.officiantId,
      "payment",
      "Payment received. You can now sign the agreement."
    );

    res.status(200).json({
      message: "Payment marked as completed",
      agreement,
    });
  } catch (error) {
    console.error("Error marking payment completed:", error);
    res
      .status(500)
      .json({ message: "Error updating payment status", error: error.message });
  }
};

// Upload Officiant Signature
exports.uploadOfficiantSignature = async (req, res) => {
  try {
    const { agreementId } = req.params;

    if (!req.file) {
      return res
        .status(400)
        .json({ message: "Officiant signature is required" });
    }

    const agreement = await Agreement.findById(agreementId);
    if (!agreement) {
      return res.status(404).json({ message: "Agreement not found" });
    }

    if (agreement.status !== "payment_completed") {
      return res
        .status(400)
        .json({ message: "Payment must be completed before signing" });
    }

    const baseUrl =
      process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
    agreement.officiantSignature = `${baseUrl}/uploads/signatures/${req.file.filename}`;
    agreement.status = "officiant_signed";
    agreement.officiantSignedAt = new Date();
    agreement.completedAt = new Date();
    agreement.updatedAt = new Date();

    await agreement.save();

    // Update user's AgreementAccepted status (ensure it's true)
    await User.findByIdAndUpdate(agreement.userId, { AgreementAccepted: true });

    // Notify user
    await createNotification(
      agreement.userId,
      "agreement",
      "Agreement completed! You can now create your ceremony."
    );

    res.status(200).json({
      message: "Agreement signed successfully",
      agreement,
    });
  } catch (error) {
    console.error("Error uploading officiant signature:", error);
    res
      .status(500)
      .json({ message: "Error uploading signature", error: error.message });
  }
};

// Get All Agreements (Admin only)
exports.getAllAgreements = async (req, res) => {
  try {
    const agreements = await Agreement.find().sort({ createdAt: -1 });
    res.status(200).json({
      message: "Agreements retrieved successfully",
      agreements,
    });
  } catch (error) {
    console.error("Error fetching agreements:", error);
    res
      .status(500)
      .json({ message: "Error fetching agreements", error: error.message });
  }
};

module.exports = exports;
