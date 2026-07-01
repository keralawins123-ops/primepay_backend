 const AppUpdate = require('../models/AppUpdate');

exports.getAppUpdate = async (req, res) => {

    const update = await AppUpdate.findOne().sort({ createdAt: -1 });

    if (!update) {
        return res.status(404).json({
            success: false,
            message: "No update found"
        });
    }

    res.json({
        success: true,
        data: update
    });

};

exports.getAppUpdates = async (req, res) => {
  try {
    const s       = await getOrCreate();
    const active  = s.contacts.filter(c => c.isActive);
    return successResponse(res, active);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};


exports.updateAppUpdate = async (req, res) => {

    const {
        latestVersion,
        buildNumber,
        mandatory,
        title,
        message,
        apkUrl,
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
            apkUrl,
            isEnabled,
            releaseNotes
        });

    } else {

        update.latestVersion = latestVersion;
        update.buildNumber = buildNumber;
        update.mandatory = mandatory;
        update.title = title;
        update.message = message;
        update.apkUrl = apkUrl;
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