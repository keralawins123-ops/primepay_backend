 const AppUpdate = require('../models/AppUpdate');

const { generateSignedApkUrl } = require('../utils/s3SignedUrl');

exports.getAppUpdate = async (req, res) => {
  try {
    const update = await AppUpdate.findOne().sort({ createdAt: -1 });

    if (!update) {
      return res.status(404).json({
        success: false,
        message: "No update found"
      });
    }

    let apkUrl = "";
    if (update.s3Key) {
      apkUrl = await generateSignedApkUrl(update.s3Key);
    }

    return res.json({
      success: true,
      data: {
        _id: update._id,
        latestVersion: update.latestVersion,
        buildNumber: update.buildNumber,
        mandatory: update.mandatory,
        title: update.title,
        message: update.message,
        isEnabled: update.isEnabled,
        releaseNotes: update.releaseNotes,
        s3Key: update.s3Key,
        apkUrl,  
        createdAt: update.createdAt,
        updatedAt: update.updatedAt
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getAdminAppUpdate = async (req, res) => {
  try {
    const update = await AppUpdate.findOne().sort({ createdAt: -1 });

    if (!update) {
      return res.json({
        success: true,
        data: null
      });
    }

    return res.json({
      success: true,
      data: update
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateAppUpdate = async (req, res) => {

    const {
        latestVersion,
        buildNumber,
        mandatory,
        title,
        message,
        s3Key,
        isEnabled,
        releaseNotes
    } = req.body;

    let update = await AppUpdate.findOne();

    if (!update) {

        update = new AppUpdate({
            latestVersion,
            buildNumber,
            mandatory,
            title,
            message,
            s3Key,
            isEnabled,
            releaseNotes
        });

    } else {

        update.latestVersion = latestVersion;
        update.buildNumber = buildNumber;
        update.mandatory = mandatory;
        update.title = title;
        update.message = message;
        update.s3Key = s3Key;
        update.isEnabled = isEnabled;
        update.releaseNotes = releaseNotes;

    }

    await update.save();

    res.json({
        success: true,
        message: "App update saved successfully.",
        data: update
    });

};