pragma Singleton
import QtQuick

QtObject {
    readonly property color background: "#0E1116"
    readonly property color surface: "#151A21"
    readonly property color panel: "#1B222C"
    readonly property color panelRaised: "#232C38"
    readonly property color border: "#2E3947"
    readonly property color text: "#F2F5F7"
    readonly property color textMuted: "#9BA8B6"
    readonly property color textFaint: "#627080"
    readonly property color accent: "#D7FF4F"
    readonly property color accentMuted: "#8EA82F"
    readonly property color success: "#62E6A7"
    readonly property color warning: "#FFCA62"
    readonly property color danger: "#FF7474"

    readonly property int space1: 4
    readonly property int space2: 8
    readonly property int space3: 12
    readonly property int space4: 16
    readonly property int space5: 24
    readonly property int space6: 32

    readonly property string displayFont: "Saira Condensed"
    readonly property string bodyFont: "IBM Plex Sans"
    readonly property string monoFont: "IBM Plex Mono"
}
