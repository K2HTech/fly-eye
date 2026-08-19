import QtQuick
import QtQuick.Controls
import "." as FlyEye

ApplicationWindow {
    id: window

    property string activeScreen: "live"

    function showLiveMonitor() {
        window.activeScreen = "live"
    }

    function showClipReview() {
        window.activeScreen = "review"
    }

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
        visible: window.activeScreen === "live"
        enabled: visible

        onReviewRequested: window.showClipReview()
    }

    FlyEye.ClipReview {
        id: clipReview
        objectName: "clipReview"
        anchors.centerIn: parent
        width: window.width - 48
        height: Math.min(window.height - 48, width / 2.05)
        visible: window.activeScreen === "review"
        enabled: visible

        onBackRequested: window.showLiveMonitor()
        onDecisionRequested: console.info("Clip reconstruction completed")
    }
}
