import QtQuick
import QtQuick.Controls
import "." as FlyEye

ApplicationWindow {
    id: window

    visible: true
    width: 1440
    height: 900
    minimumWidth: 1100
    minimumHeight: 700
    title: "FLY EYE"
    color: FlyEye.Theme.background

    FlyEye.LiveMonitor {
        id: liveMonitor
        objectName: "liveMonitor"
        anchors.centerIn: parent
        width: window.width - 48
        height: Math.min(window.height - 48, width / 2.05)

        onReviewRequested: console.info("Live monitor review requested")
    }
}
