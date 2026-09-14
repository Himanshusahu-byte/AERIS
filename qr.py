import qrcode

link = "https://github.com/Himanshusahu-byte/AERIS"

qr = qrcode.make(link)
qr.save("AERIS_QR.png")

print("QR generated successfully")
