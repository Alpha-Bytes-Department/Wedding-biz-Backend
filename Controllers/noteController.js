const note = require("../Models/NoteSchema");
const { createNotification } = require("./notificationController");

// create note function
exports.createNote = async (req, res) => {
  const { title, message, from_userName, from_userId, to_userId, related_to } =
    req.body;

  try {
    const newNote = new note({
      title,
      message,
      from_userName,
      from_userId,
      to_userId,
      related_to,
    });
    console.log("New note created:", newNote);

    await newNote.save();
    createNotification(to_userId, 'Note', `New note from ${from_userName}`);
    res.status(201).json({ msg: "Note created successfully", newNote });

  } catch (err) {
    console.error("Error creating note:", err);
    res.status(500).json({ error: err.message });
  }
};

// delete the note
exports.deleteNote = async (req, res) => {
  const noteId = req.params.id;
  console.log("Delete request for note ID:", noteId);
  try {
    const deletedNote = await note.findByIdAndDelete(noteId);
    if (!deletedNote) {
      return res.status(404).json({ error: "Note not found" });
    }
    createNotification(deletedNote.to_userId, 'Note', `A note from "${deletedNote.from_userName}" has been deleted.`);
    res.status(200).json({ msg: "Note deleted successfully", deletedNote });
  } catch (err) {
    console.error("Error deleting note:", err);
    res.status(500).json({ error: err.message });
  }
};
 
// get notes by user ID
exports.getNotesByUserId = async (req, res) => {
  const userId = req.params.userId;
  // console.log("Fetching notes for user ID:", userId);
  try {
    const notes = await note
      .find({ to_userId: userId })
      .sort({ createdAt: -1 });
    res.status(200).json(notes);
  } catch (err) {
    console.error("Error fetching notes:", err);
    res.status(500).json({ error: err.message });
  }
};

