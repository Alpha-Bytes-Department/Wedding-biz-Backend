const e = require("express");
const User = require("../Models/UserCredential");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const EMAIL_SECRET = process.env.EMAIL_SECRET;

const createTokens = (userId, role) => {
  const accessToken = jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: "45m",
  });
  const refreshToken = jwt.sign(
    { id: userId, role },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
  return { accessToken, refreshToken };
};

//  Register
exports.registerUser = async (req, res) => {
  try {
    const { partner_1, partner_2, email, password } = req.body;
    console.log("Registering user:", email, partner_1, partner_2, password);
    let user = await User.findOne({ email });
    if (user) {
      console.log("Registration failed: Email already exists:", email);
      return res.status(400).json({ msg: "Email already exists" });
    }

    user = new User({ partner_1, partner_2, email, password });
    await user.save();
    console.log("User saved to database:", user._id);

    // Email verification link
    const emailToken = jwt.sign({ id: user._id }, EMAIL_SECRET, {
      expiresIn: "1d",
    });
    const url = `http://localhost:3000/verify/${emailToken}`;

    // Send mail
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      to: email,
      subject: "Verify your email - ERIE WEDDING OFFICIANT",
      html: `
  <!DOCTYPE html>
  <html lang="en" style="margin:0;padding:0;">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Email Verification</title>
    </head>
    <body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#fff8f0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#fff8f0; padding:40px 0;">
        <tr>
          <td align="center">
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background:#ffffff; border-radius:12px; box-shadow:0 4px 10px rgba(0,0,0,0.08);">
              <tr>
                <td style="background:linear-gradient(90deg, #ffb347, #ffcc33); padding:20px; border-radius:12px 12px 0 0; text-align:center;">
                  <h1 style="margin:0; font-size:28px; color:#ffffff;">ERIE WEDDING OFFICIANT</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:30px; text-align:left; color:#333333;">
                  <h2 style="color:#ff9900; margin-top:0;">Verify Your Email</h2>
                  <p style="font-size:16px; line-height:1.6; color:#555555;">
                    Thank you for signing up with <strong>ERIE WEDDING OFFICIANT</strong>!  
                    Before we can get started, we just need to confirm that this email address belongs to you.  
                  </p>
                  <p style="font-size:16px; line-height:1.6; color:#555555;">
                    Please click the button below to verify your account:
                  </p>
                  <div style="text-align:center; margin:30px 0;">
                    <a href="${url}" target="_blank" style="background:linear-gradient(90deg,#ffb347,#ff9900); color:#ffffff; text-decoration:none; padding:14px 28px; border-radius:30px; font-size:16px; font-weight:bold; display:inline-block;">
                      Verify My Email
                    </a>
                  </div>
                  <p style="font-size:14px; color:#999999; line-height:1.6;">
                    If you did not create an account with ERIE WEDDING OFFICIANT, you can safely ignore this email.  
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background:#fdf2e6; text-align:center; padding:20px; border-radius:0 0 12px 12px;">
                  <p style="margin:0; font-size:13px; color:#777777;">
                    © ${new Date().getFullYear()} ERIE WEDDING OFFICIANT. All rights reserved.  
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `,
    });

    console.log("Verification email sent to:", email);

    res.json({
      msg: "Registration successful! Please check your email to verify.",
    });
  } catch (err) {
    console.error("Error during registration:", err);
    res.status(500).json({ error: err.message });
  }
};

// Social Login (Google, Facebook)

exports.socialLogin = async (req, res) => {};

//  Verify Email
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, EMAIL_SECRET);
    await User.findByIdAndUpdate(decoded.id, { isVerified: true });
    res.send("Email verified successfully!");
  } catch (err) {
    res.status(400).send("Invalid or expired token");
  }
};

//  Login
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ msg: "User not found" });

  const isMatch = await user.comparePassword(password);
  if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

  if (!user.isVerified)
    return res.status(400).json({ msg: "Verify your email first" });

  const { accessToken, refreshToken } = createTokens(user._id, user.role);

  // Save refreshToken in DB
  user.refreshToken = refreshToken;
  await user.save();

  res.json({ accessToken, refreshToken, user });
};

//  Refresh Token
exports.refreshToken = async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(401).json({ msg: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== token)
      return res.status(403).json({ msg: "Invalid refresh token" });

    // Generate new tokens
    const { accessToken, refreshToken } = createTokens(user._id, user.role);

    user.refreshToken = refreshToken; // update refresh token
    await user.save();

    res.json({ accessToken, refreshToken });
  } catch (err) {
    res.status(403).json({ msg: "Invalid or expired token" });
  }
};

// logout function
exports.logoutUser = async (req, res) => {
  console.log("Logging out user:", req.body);
  const { token } = req.body;
  if (!token) return res.sendStatus(204);
  const user = await User.findOne({ refreshToken: token });
  if (user) {
    user.refreshToken = null;
    await user.save();
  }
  res.sendStatus(204);
};

// Get user
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -refreshToken"
    );
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get All Users (Admin only)
exports.getAllUsers = async (req, res) => {
  // if (req.user.role !== "admin") {
  //   return res.status(403).json({ msg: "Access denied" });
  // }
  try {
    const users = await User.find().select("-password -refreshToken");
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Forget Password
exports.forgetPassword = async (req, res) => {
  const { email } = req.body;
  try {
    console.log("Password reset requested for:", email);

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "User not found" });
    }

    // Generate password reset token
    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // Create reset URL
    const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;

    // Send reset email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

  await transporter.sendMail({
    to: email,
    subject: "Password Reset Request - ERIE WEDDING OFFICIANT",
    html: `
  <!DOCTYPE html>
  <html lang="en" style="margin:0; padding:0;">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Password Reset</title>
    </head>
    <body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#fff8f0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#fff8f0; padding:40px 0;">
        <tr>
          <td align="center">
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background:#ffffff; border-radius:12px; box-shadow:0 4px 10px rgba(0,0,0,0.08);">
              <tr>
                <td style="background:linear-gradient(90deg, #ffb347, #ffcc33); padding:20px; border-radius:12px 12px 0 0; text-align:center;">
                  <h1 style="margin:0; font-size:28px; color:#ffffff;">ERIE WEDDING OFFICIANT</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:30px; text-align:left; color:#333333;">
                  <h2 style="color:#ff9900; margin-top:0;">Password Reset Request</h2>
                  <p style="font-size:16px; line-height:1.6; color:#555555;">
                    We received a request to reset your password. Click the button below to create a new password:
                  </p>
                  <div style="text-align:center; margin:30px 0;">
                    <a href="${resetUrl}" target="_blank" style="background:linear-gradient(90deg,#ffb347,#ff9900); color:#ffffff; text-decoration:none; padding:14px 28px; border-radius:30px; font-size:16px; font-weight:bold; display:inline-block;">
                      Reset My Password
                    </a>
                  </div>
                  <p style="font-size:16px; color:#555555; line-height:1.6;">
                    This link will expire in 1 hour.
                  </p>
                  <p style="font-size:14px; color:#999999; line-height:1.6;">
                    If you did not request a password reset, you can safely ignore this email.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background:#fdf2e6; text-align:center; padding:20px; border-radius:0 0 12px 12px;">
                  <p style="margin:0; font-size:13px; color:#777777;">
                    © ${new Date().getFullYear()} ERIE WEDDING OFFICIANT. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `,
  });


    console.log("Password reset email sent to:", email);
    res
      .status(200)
      .json({ msg: "Password reset link has been sent to your email" });
  } catch (err) {
    console.error("Error in forget password:", err);
    res.status(500).json({ error: err.message });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ msg: "Password is required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(400).json({ msg: "Invalid or expired token" });
    }

    user.password = password;
    await user.save();

    console.log("Password reset successful for user:", user.email);
    res.json({ msg: "Password reset successful" });
  } catch (err) {
    console.error("Error in reset password:", err);
    res.status(400).json({ msg: "Invalid or expired token" });
  }
};

// update user
exports.updateUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateFields = {};
    const allowedFields = [
      "partner_1",
      "part ner_2",
      "phone",
      "bio",
      "bookingMoney",
      "location",
      "weddingDate",
    ];

    allowedFields.forEach((field) => {
      if (
        req.body[field] !== undefined &&
        req.body[field] !== null &&
        req.body[field] !== ""
      ) {
        updateFields[field] = req.body[field];
      }
    });

    // Handle profile picture upload and set full URL
    if (req.file && req.file.filename) {
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      updateFields.profilePicture = `${baseUrl}/uploads/${req.file.filename}`;
    }

    updateFields.updatedAt = Date.now();

    const user = await User.findByIdAndUpdate(userId, updateFields, {
      new: true,
      select: "-password -refreshToken",
    });

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json({ msg: "User updated successfully", user });
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ error: err.message });
  }
};

// get officiants for public
exports.getOfficiants = async (req, res) => {
  try {
    const officiants = await User.find({ role: "officiant", isVerified: true });
    res.status(200).json({ officiants });
  } catch (err) {
    console.error("Error fetching officiants:", err);
    res.status(500).json({ error: err.message });
  }
};

// get individual officiant details
exports.getOfficiantDetails = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Fetching officiant with ID:", id);
    
    const officiant = await User.findById(id);
    if (!officiant) {
      return res.status(404).json({ msg: "Officiant not found" });
    }
    res.status(200).json({ officiant });
  } catch (err) {
    console.error("Error fetching officiant details:", err);
    console.error("Error message:", err.message);
    res.status(500).json({ error: err.message });
  }
};

//  Protected Example
exports.getDashboard = async (req, res) => {
  res.json({ msg: "Welcome to dashboard", user: req.user });
};
