import QtQuick
import QtQuick.Layouts
import "." as FlyEye

// Small, quiet fact box under the verdict.  Values are properties so a later
// reconstruction service can replace the deterministic demo data directly.
Rectangle {
    id: root
    objectName: "evidencePanel"

    property int landingFrame: 1284
    property string camerasUsed: "A + B"
    property string reprojectionError: "1.8 px"
    property string calibrationAge: "42 min"

    property string landingFrameLabel: "Landing frame"
    property string camerasUsedLabel: "Cameras used"
    property string reprojectionErrorLabel: "Reprojection error"
    property string calibrationAgeLabel: "Calibration age"

    implicitWidth: 320
    implicitHeight: 166
    radius: 9
    color: FlyEye.Theme.well
    border.width: 1
    border.color: FlyEye.Theme.border

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: FlyEye.Theme.space3
        spacing: 0

        InfoRow {
            objectName: "landingFrameRow"
            label: root.landingFrameLabel
            value: String(root.landingFrame)
            Layout.fillWidth: true
            Layout.preferredHeight: 28
        }

        InfoRow {
            objectName: "camerasUsedRow"
            label: root.camerasUsedLabel
            value: root.camerasUsed
            Layout.fillWidth: true
            Layout.preferredHeight: 28
        }

        InfoRow {
            objectName: "reprojectionErrorRow"
            label: root.reprojectionErrorLabel
            value: root.reprojectionError
            Layout.fillWidth: true
            Layout.preferredHeight: 28
        }

        InfoRow {
            objectName: "calibrationAgeRow"
            label: root.calibrationAgeLabel
            value: root.calibrationAge
            Layout.fillWidth: true
            Layout.preferredHeight: 28
        }
    }
}
