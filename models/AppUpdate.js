const mongoose = require("mongoose");

const appUpdateSchema = new mongoose.Schema(
  {
    latestVersion: {
      type: String,
      required: true,
    },
    buildNumber: {
      type: Number,
      required: true,
    },
    mandatory: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: "Update Available",
    },
    message: {
      type: String,
      default: "",
    },
    apkUrl: {
      type: String,
      required: true,
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
    releaseNotes: {
      type: String,
      default: "",
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("AppUpdate", appUpdateSchema);