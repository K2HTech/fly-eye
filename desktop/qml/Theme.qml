pragma Singleton
import QtQuick

QtObject {
    readonly property color background: "#0E1116"
    readonly property color surface: "#171C24"
    readonly property color panel: "#12161E"
    readonly property color panelRaised: "#1B222C"
    readonly property color well: "#0A0D12"
    readonly property color courtWell: "#0B1A11"
    readonly property color court: "#17402A"
    readonly property color border: "#262E3A"
    readonly property color text: "#F2F4F0"
    readonly property color textMuted: "#7C8798"
    readonly property color textFaint: "#525C6B"
    readonly property color accent: "#4C8DFF"
    readonly property color accentMuted: "#16233A"
    readonly property color amber: "#E8A33D"
    readonly property color success: "#35D07F"
    readonly property color warning: amber
    readonly property color danger: "#FF4D4D"

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
