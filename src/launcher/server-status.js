// ========================================
// SERVER STATUS - Statut du serveur
// ========================================

const net = require('net');

/**
 * Ping un serveur Minecraft pour obtenir son statut
 * @param {string} host - Adresse IP du serveur
 * @param {number} port - Port du serveur (défaut: 25565)
 * @param {number} timeout - Timeout en ms (défaut: 5000)
 * @returns {Promise<object>}
 */
function pingServer(host, port = 25565, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        let data = Buffer.alloc(0);

        socket.setTimeout(timeout);

        socket.on('connect', () => {
            // Handshake packet
            const hostBuffer = Buffer.from(host, 'utf8');
            const handshakeData = Buffer.concat([
                Buffer.from([0x00]), // Packet ID
                writeVarInt(760), // Protocol version (1.19.2)
                writeVarInt(hostBuffer.length),
                hostBuffer,
                Buffer.from([port >> 8, port & 0xFF]), // Port
                Buffer.from([0x01]) // Next state (status)
            ]);

            const handshakePacket = Buffer.concat([
                writeVarInt(handshakeData.length),
                handshakeData
            ]);

            // Status request packet
            const statusRequest = Buffer.from([0x01, 0x00]);

            socket.write(Buffer.concat([handshakePacket, statusRequest]));
        });

        socket.on('data', (chunk) => {
            data = Buffer.concat([data, chunk]);

            try {
                // Lire la longueur du packet
                const { value: packetLength, bytesRead } = readVarInt(data);

                if (data.length >= bytesRead + packetLength) {
                    // Packet complet reçu
                    const packetData = data.slice(bytesRead, bytesRead + packetLength);
                    const { bytesRead: idBytes } = readVarInt(packetData);

                    // Lire la longueur du JSON
                    const jsonData = packetData.slice(idBytes);
                    const { value: jsonLength, bytesRead: jsonLenBytes } = readVarInt(jsonData);
                    const jsonString = jsonData.slice(jsonLenBytes, jsonLenBytes + jsonLength).toString('utf8');

                    const response = JSON.parse(jsonString);

                    socket.destroy();
                    resolve({
                        online: true,
                        players: {
                            online: response.players.online,
                            max: response.players.max,
                            sample: response.players.sample || []
                        },
                        version: response.version.name,
                        protocol: response.version.protocol,
                        description: response.description,
                        favicon: response.favicon || null
                    });
                }
            } catch (e) {
                // Continuer à attendre plus de données
            }
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve({
                online: false,
                players: { online: 0, max: 0 },
                version: 'N/A',
                error: 'Timeout'
            });
        });

        socket.on('error', (err) => {
            socket.destroy();
            resolve({
                online: false,
                players: { online: 0, max: 0 },
                version: 'N/A',
                error: err.message
            });
        });

        socket.connect(port, host);
    });
}

/**
 * Écrit un VarInt
 * @param {number} value - Valeur à écrire
 * @returns {Buffer}
 */
function writeVarInt(value) {
    const bytes = [];
    while (true) {
        if ((value & ~0x7F) === 0) {
            bytes.push(value);
            break;
        }
        bytes.push((value & 0x7F) | 0x80);
        value >>>= 7;
    }
    return Buffer.from(bytes);
}

/**
 * Lit un VarInt
 * @param {Buffer} buffer - Buffer à lire
 * @returns {{ value: number, bytesRead: number }}
 */
function readVarInt(buffer) {
    let value = 0;
    let bytesRead = 0;
    let currentByte;

    do {
        currentByte = buffer[bytesRead];
        value |= (currentByte & 0x7F) << (7 * bytesRead);
        bytesRead++;

        if (bytesRead > 5) {
            throw new Error('VarInt trop long');
        }
    } while ((currentByte & 0x80) !== 0);

    return { value, bytesRead };
}

module.exports = {
    pingServer
};
