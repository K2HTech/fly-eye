import QtQuick

// A deterministic, lightweight stand-in for a camera image.  The artwork is
// intentionally painted in a 320x180 coordinate space so it remains legible
// at both the compact and full-size monitor layouts.
Item {
    id: root

    property string variant: "sideline"
    property color courtColor: "#17402A"
    property color courtLineColor: "#F2F4F0"
    property color trajectoryColor: "#E8A33D"
    property color shuttleColor: "#D6E0F0"

    implicitWidth: 320
    implicitHeight: 180

    Canvas {
        id: canvas
        anchors.fill: parent
        antialiasing: true

        onPaint: {
            var ctx = getContext("2d")
            var sceneScale = Math.min(width / 320, height / 180)
            var offsetX = (width - 320 * sceneScale) / 2
            var offsetY = (height - 180 * sceneScale) / 2

            ctx.clearRect(0, 0, width, height)
            ctx.fillStyle = "#0B1A11"
            ctx.fillRect(0, 0, width, height)
            ctx.save()
            ctx.translate(offsetX, offsetY)
            ctx.scale(sceneScale, sceneScale)

            if (root.variant.toLowerCase() === "baseline") {
                paintBaseline(ctx)
            } else {
                paintSideline(ctx)
            }

            ctx.restore()
        }

        function line(ctx, x1, y1, x2, y2, width, opacity) {
            ctx.save()
            ctx.globalAlpha = opacity === undefined ? 1 : opacity
            ctx.strokeStyle = root.courtLineColor
            ctx.lineWidth = width
            ctx.beginPath()
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
            ctx.stroke()
            ctx.restore()
        }

        function path(ctx, points, width, opacity) {
            ctx.save()
            ctx.globalAlpha = opacity === undefined ? 1 : opacity
            ctx.strokeStyle = root.courtLineColor
            ctx.lineWidth = width
            ctx.beginPath()
            ctx.moveTo(points[0], points[1])
            for (var i = 2; i < points.length; i += 2)
                ctx.lineTo(points[i], points[i + 1])
            ctx.closePath()
            ctx.stroke()
            ctx.restore()
        }

        function trajectory(ctx, startX, startY, controlX, controlY, endX, endY) {
            ctx.save()
            ctx.strokeStyle = root.trajectoryColor
            ctx.lineWidth = 1.8
            ctx.setLineDash([5, 4])
            ctx.beginPath()
            ctx.moveTo(startX, startY)
            ctx.quadraticCurveTo(controlX, controlY, endX, endY)
            ctx.stroke()
            ctx.restore()
        }

        function marker(ctx, x, y, radius) {
            ctx.save()
            ctx.fillStyle = root.courtLineColor
            ctx.beginPath()
            ctx.arc(x, y, radius, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()
        }

        function paintSideline(ctx) {
            ctx.save()
            ctx.fillStyle = root.courtColor
            ctx.beginPath()
            ctx.moveTo(38, 172)
            ctx.lineTo(118, 58)
            ctx.lineTo(214, 58)
            ctx.lineTo(302, 172)
            ctx.closePath()
            ctx.fill()
            ctx.restore()

            path(ctx, [38, 172, 118, 58, 214, 58, 302, 172], 1.4, 0.92)
            line(ctx, 62, 138, 278, 138, 1.4, 0.92)
            line(ctx, 95, 95, 242, 95, 1.4, 0.92)
            line(ctx, 108, 76, 228, 76, 1.4, 0.92)

            ctx.save()
            ctx.globalAlpha = 0.6
            ctx.strokeStyle = root.courtLineColor
            ctx.lineWidth = 1.4
            ctx.setLineDash([3, 4])
            ctx.beginPath()
            ctx.moveTo(170, 172)
            ctx.lineTo(166, 58)
            ctx.stroke()
            ctx.restore()

            line(ctx, 68, 58, 68, 122, 2, 0.45)
            line(ctx, 266, 58, 266, 122, 2, 0.45)
            line(ctx, 68, 86, 266, 86, 2, 0.45)

            trajectory(ctx, 244, 34, 216, 88, 196, 128)
            marker(ctx, 196, 128, 4)

            ctx.save()
            ctx.fillStyle = "#000000"
            ctx.globalAlpha = 0.35
            ctx.beginPath()
            ctx.ellipse(118, 148, 10, 4, 0, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()

            ctx.save()
            ctx.strokeStyle = root.shuttleColor
            ctx.lineWidth = 3.2
            ctx.lineCap = "round"
            ctx.beginPath()
            ctx.moveTo(118, 148)
            ctx.lineTo(118, 124)
            ctx.lineTo(110, 111)
            ctx.moveTo(118, 124)
            ctx.lineTo(127, 110)
            ctx.stroke()
            ctx.fillStyle = root.shuttleColor
            ctx.beginPath()
            ctx.arc(118, 106, 5, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()
        }

        function paintBaseline(ctx) {
            ctx.save()
            ctx.fillStyle = root.courtColor
            ctx.beginPath()
            ctx.moveTo(18, 176)
            ctx.lineTo(94, 44)
            ctx.lineTo(226, 44)
            ctx.lineTo(302, 176)
            ctx.closePath()
            ctx.fill()
            ctx.restore()

            path(ctx, [18, 176, 94, 44, 226, 44, 302, 176], 1.4, 0.92)
            line(ctx, 42, 132, 278, 132, 1.4, 0.92)
            line(ctx, 72, 82, 248, 82, 1.4, 0.92)

            ctx.save()
            ctx.globalAlpha = 0.6
            ctx.strokeStyle = root.courtLineColor
            ctx.lineWidth = 1.4
            ctx.setLineDash([3, 4])
            ctx.beginPath()
            ctx.moveTo(160, 176)
            ctx.lineTo(160, 44)
            ctx.stroke()
            ctx.restore()

            line(ctx, 38, 142, 282, 142, 3, 1)
            trajectory(ctx, 238, 50, 220, 106, 205, 150)
            marker(ctx, 205, 150, 4.5)

            ctx.save()
            ctx.strokeStyle = "#4C8DFF"
            ctx.lineWidth = 1.4
            ctx.setLineDash([4, 3])
            ctx.strokeRect(186, 130, 44, 36)
            ctx.restore()
        }

        Connections {
            target: root
            function onVariantChanged() { canvas.requestPaint() }
            function onCourtColorChanged() { canvas.requestPaint() }
            function onCourtLineColorChanged() { canvas.requestPaint() }
            function onTrajectoryColorChanged() { canvas.requestPaint() }
            function onShuttleColorChanged() { canvas.requestPaint() }
        }
    }
}
