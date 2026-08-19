import QtQuick
import QtQuick.Layouts
import "." as FlyEye

// Two review feeds share one frame number.  The grid deliberately owns the
// timeline position rather than either camera, so stepping the review clip
// cannot leave the angles on different moments.
Item {
    id: root

    property int frameNumber: 1284
    property alias cameraA: cameraAControl
    property alias cameraB: cameraBControl

    implicitWidth: 856
    implicitHeight: 286

    RowLayout {
        anchors.fill: parent
        spacing: 12

        FlyEye.CameraFeed {
            id: cameraAControl
            objectName: "cameraA"
            Layout.fillWidth: true
            Layout.fillHeight: true
            Layout.minimumWidth: 280
            cameraTitle: "Cam A — sideline"
            cameraVariant: "sideline"
            latency: "4.2 ms"
            live: false
            metadata: "f " + root.frameNumber
        }

        FlyEye.CameraFeed {
            id: cameraBControl
            objectName: "cameraB"
            Layout.fillWidth: true
            Layout.fillHeight: true
            Layout.minimumWidth: 280
            cameraTitle: "Cam B — baseline"
            cameraVariant: "baseline"
            latency: "4.4 ms"
            live: false
            metadata: "f " + root.frameNumber
        }
    }
}
