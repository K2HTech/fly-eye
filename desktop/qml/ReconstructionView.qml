import QtQuick
import "." as FlyEye

// A deliberately deterministic reconstruction plate.  It is painted in the
// same 700 x 320 coordinate space as the design mockup, then uniformly scaled
// by the artboard so the court never stretches when the decision panel is
// resized.
Item {
    id: root

    property string verdict: "OUT"
    property int distanceMm: 24
    property string boundaryLabel: "back boundary"
    property bool showLegend: true

    property color wellColor: FlyEye.Theme.courtWell
    property color courtColor: FlyEye.Theme.court
    property color lineColor: FlyEye.Theme.text
    property color trajectoryColor: FlyEye.Theme.amber
    property color landingColor: FlyEye.Theme.danger
    property color labelColor: FlyEye.Theme.textMuted

    implicitWidth: 700
    implicitHeight: showLegend ? 350 : 320

    Item {
        id: artboard

        width: Math.max(1, Math.min(root.width,
                                    Math.max(1, root.height - (root.showLegend ? legend.height + 8 : 0))
                                    * 700 / 320))
        height: width * 320 / 700
        anchors.top: parent.top
        anchors.horizontalCenter: parent.horizontalCenter

        Rectangle {
            id: artWell
            objectName: "reconstructionWell"
            anchors.fill: parent
            radius: Math.max(2, width * 8 / 700)
            color: root.wellColor
            border.width: Math.max(1, width * 1 / 700)
            border.color: FlyEye.Theme.border
        }

        Canvas {
            id: reconstructionCanvas
            objectName: "reconstructionCanvas"
            anchors.fill: parent
            antialiasing: true

            onPaint: {
                var ctx = getContext("2d")
                var scale = width / 700

                ctx.clearRect(0, 0, width, height)
                ctx.save()
                ctx.scale(scale, scale)

                // Court surface and outside edge.
                ctx.fillStyle = root.courtColor
                ctx.fillRect(60, 46, 580, 230)
                ctx.strokeStyle = root.lineColor
                ctx.globalAlpha = 1
                ctx.lineWidth = 3
                ctx.strokeRect(60, 46, 580, 230)

                // Badminton markings: service lines, doubles sidelines,
                // centre line and the faint centre reference.
                ctx.globalAlpha = 0.8
                ctx.lineWidth = 2
                line(ctx, 60, 86, 640, 86)
                line(ctx, 98, 46, 98, 276)
                line(ctx, 602, 46, 602, 276)
                line(ctx, 236, 46, 236, 276)
                line(ctx, 464, 46, 464, 276)

                ctx.globalAlpha = 0.5
                ctx.setLineDash([7, 6])
                line(ctx, 350, 46, 350, 276)
                ctx.setLineDash([])

                // Reconstructed shuttle trajectory.
                ctx.globalAlpha = 1
                ctx.strokeStyle = root.trajectoryColor
                ctx.lineWidth = 3
                ctx.setLineDash([8, 6])
                ctx.beginPath()
                ctx.moveTo(150, 262)
                ctx.quadraticCurveTo(246, 160, 312, 62)
                ctx.stroke()
                ctx.setLineDash([])

                // Landing halo, centre point and a small measurement bracket
                // extending outside the back boundary.
                ctx.fillStyle = Qt.rgba(root.landingColor.r, root.landingColor.g,
                                        root.landingColor.b, 0.18)
                ctx.beginPath()
                ctx.arc(318, 46, 16, 0, Math.PI * 2)
                ctx.fill()

                ctx.strokeStyle = root.landingColor
                ctx.lineWidth = 2
                line(ctx, 318, 46, 318, 30)
                line(ctx, 309, 30, 327, 30)
                ctx.fillStyle = root.landingColor
                ctx.beginPath()
                ctx.arc(318, 46, 6.5, 0, Math.PI * 2)
                ctx.fill()
                ctx.strokeStyle = root.lineColor
                ctx.lineWidth = 2
                ctx.stroke()

                // Callout is kept in the artboard so it moves with the
                // landing point at every responsive size.
                ctx.fillStyle = Qt.rgba(root.landingColor.r, root.landingColor.g,
                                        root.landingColor.b, 0.12)
                roundedRect(ctx, 342, 16, 150, 34, 6)
                ctx.fill()
                ctx.strokeStyle = Qt.rgba(root.landingColor.r, root.landingColor.g,
                                          root.landingColor.b, 0.5)
                ctx.lineWidth = 1
                roundedRect(ctx, 342, 16, 150, 34, 6)
                ctx.stroke()
                ctx.fillStyle = root.landingColor
                ctx.font = "bold 22px 'Saira Condensed'"
                ctx.fillText(root.distanceMm + " mm " + root.verdict.toUpperCase(), 356, 39)

                // Explanatory labels from the design plate.
                ctx.fillStyle = root.labelColor
                ctx.font = "12px 'IBM Plex Mono'"
                ctx.fillText(root.boundaryLabel.toUpperCase(), 62, 34)
                ctx.fillStyle = FlyEye.Theme.textFaint
                ctx.font = "11px 'IBM Plex Mono'"
                ctx.textAlign = "right"
                ctx.fillText("CAM A + CAM B", 638, 300)
                ctx.textAlign = "left"

                ctx.restore()
            }

            function line(ctx, x1, y1, x2, y2) {
                ctx.beginPath()
                ctx.moveTo(x1, y1)
                ctx.lineTo(x2, y2)
                ctx.stroke()
            }

            function roundedRect(ctx, x, y, width, height, radius) {
                ctx.beginPath()
                ctx.moveTo(x + radius, y)
                ctx.lineTo(x + width - radius, y)
                ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
                ctx.lineTo(x + width, y + height - radius)
                ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
                ctx.lineTo(x + radius, y + height)
                ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
                ctx.lineTo(x, y + radius)
                ctx.quadraticCurveTo(x, y, x + radius, y)
                ctx.closePath()
            }

            Connections {
                target: root
                function onVerdictChanged() { reconstructionCanvas.requestPaint() }
                function onDistanceMmChanged() { reconstructionCanvas.requestPaint() }
                function onBoundaryLabelChanged() { reconstructionCanvas.requestPaint() }
                function onWellColorChanged() { reconstructionCanvas.requestPaint() }
                function onCourtColorChanged() { reconstructionCanvas.requestPaint() }
                function onLineColorChanged() { reconstructionCanvas.requestPaint() }
                function onTrajectoryColorChanged() { reconstructionCanvas.requestPaint() }
                function onLandingColorChanged() { reconstructionCanvas.requestPaint() }
                function onLabelColorChanged() { reconstructionCanvas.requestPaint() }
            }
        }
    }

    Row {
        id: legend
        objectName: "reconstructionLegend"
        visible: root.showLegend
        spacing: 18
        anchors.top: artboard.bottom
        anchors.topMargin: 8
        anchors.horizontalCenter: parent.horizontalCenter

        Row {
            spacing: 6
            Rectangle { width: 14; height: 3; radius: 2; color: root.trajectoryColor; anchors.verticalCenter: parent.verticalCenter }
            Text { text: "Shuttle path"; color: FlyEye.Theme.textMuted; font.family: FlyEye.Theme.monoFont; font.pixelSize: 10; renderType: Text.NativeRendering }
        }

        Row {
            spacing: 6
            Item {
                width: 14
                height: 10
                anchors.verticalCenter: parent.verticalCenter
                Rectangle { width: 7; height: 7; radius: 4; color: root.landingColor; anchors.centerIn: parent }
            }
            Text { text: "Landing point"; color: FlyEye.Theme.textMuted; font.family: FlyEye.Theme.monoFont; font.pixelSize: 10; renderType: Text.NativeRendering }
        }

        Row {
            spacing: 6
            Rectangle { width: 14; height: 2; color: root.lineColor; anchors.verticalCenter: parent.verticalCenter }
            Text { text: "Line edge"; color: FlyEye.Theme.textMuted; font.family: FlyEye.Theme.monoFont; font.pixelSize: 10; renderType: Text.NativeRendering }
        }
    }
}
