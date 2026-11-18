/* Communication Protocols: extra questions (p13 onward). Format and rules: see the header of questions.js. APPEND ONLY.
 * Avionics bus details (ARINC 429/664, MIL-STD-1553) are summaries: learners must check the current standards. */
window.QUIZ_ADD("comm", [
  ["On a classic CAN bus, what decides which of two nodes wins arbitration when both start transmitting at the same time?",
   null,
   [
     "The lower identifier wins, because a dominant 0 overrides a recessive 1",
     "The higher identifier wins, because it carries the larger priority value",
     "The node with the longer payload wins, since it keeps the bus busy longer",
     "The node that started first wins, using a timestamp inside the frame"
   ],
   "CAN uses non-destructive bitwise arbitration on the identifier, with dominant = 0. A node that sends a recessive bit but reads a dominant one has lost and becomes a receiver without corrupting the winner's frame. So identifier assignment sets message priority."],
  ["Who acknowledges a correctly received classic CAN frame?",
   null,
   [
     "Every correct receiver drives a dominant bit in the ACK slot",
     "Only the receiver with the lowest identifier replies in the ACK slot",
     "A central bus master acknowledges each frame for all nodes",
     "Nobody does, because CAN has no acknowledgement mechanism"
   ],
   "The ACK slot is sent recessive by the transmitter and set dominant by any receiver that received the frame without error. The transmitter learns only that at least one node received it, not that all did. Applications that need end-to-end confirmation add their own protocol."],
  ["Why does CAN use bit stuffing?",
   null,
   [
     "An opposite-polarity bit follows five equal bits, so edges exist for synchronising",
     "It compresses runs of repeated data bytes to make frames shorter",
     "It encrypts the payload bits so that other nodes cannot read them",
     "It lengthens the identifier field, which allows a larger number of messages"
   ],
   "CAN is NRZ coded, so long runs of identical bits have no edges. Stuffing guarantees an edge at least every six bit times, at the cost of a variable frame length (which matters for worst-case timing)."],
  ["What is a typical termination for a high-speed CAN bus?",
   null,
   [
     "120 ohm at each of the two ends, about 60 ohm across the pair when unpowered",
     "A single 1 kilohm resistor at one end of the bus only",
     "No termination, since the transceivers already match the cable impedance",
     "A 120 ohm resistor at every node, whatever its position on the bus"
   ],
   "Terminating both ends matches the cable impedance and avoids reflections. Terminating every node reduces the load resistance below the transceiver limits. Long stubs also cause reflections, so keep them short."],
  ["What are the main differences between CAN FD and classic CAN?",
   null,
   [
     "Up to 64 data bytes, with a faster data phase",
     "A different physical medium such as fibre only",
     "Arbitration is removed, so nodes send at fixed times",
     "The payload is limited to 4 bytes to save bandwidth"
   ],
   "CAN FD (flexible data rate) keeps the arbitration phase at the nominal rate, then optionally speeds up the data phase. It needs transceivers and controllers that support it, and mixing classic-only nodes on an FD bus causes error frames."],
  ["In CAN bit timing, what does the sampling point define?",
   null,
   [
     "The point in the bit time at which the receiver reads the bus level",
     "The idle time that the bus keeps between two consecutive frames",
     "The number of identifier bits that the arbitration phase compares",
     "The voltage level that the transceiver uses for the dominant state"
   ],
   "A later sampling point (a high percentage of the bit time) helps with long buses but reduces the margin for re-synchronisation. Values are set per network by agreement and by the controller's segment settings. Check the transceiver and bus-length limits."],
  ["After a CAN node goes bus-off, what is needed before it can transmit again in a standard controller?",
   null,
   [
     "A recovery sequence of recessive bits, then a restart under the chosen policy",
     "Nothing, since a bus-off node starts transmitting again at once",
     "A new identifier that the bus master assigns to the node",
     "A hardware replacement of the transceiver, since bus-off is permanent"
   ],
   "Bus-off isolates a node that has too many transmit errors. The recovery time and policy (immediately, delayed, or latched) belong in the requirements, because an immediate automatic restart can make a persistent fault disturb the bus again."],
  ["Which CAN node state can still transmit, but must wait an extra suspend time and sends passive error flags?",
   null,
   [
     "Error passive: it sends recessive error flags and waits a suspend time",
     "Error active: it sends dominant error flags that destroy the frame",
     "Bus-off: it keeps transmitting but at a reduced bit rate",
     "Sleep: it transmits only after a wake-up pattern has been seen"
   ],
   "A node becomes error passive when its error counters reach 128. It can still communicate but signals errors with recessive flags that do not disturb the bus, and must wait an extra delay after its own transmissions. Above 255 on the transmit counter it goes bus-off."],
  ["What is the purpose of CAN acceptance filters and masks in the controller?",
   null,
   [
     "They let the hardware accept only the identifiers that the node needs",
     "They change the bit rate of the bus to suit the accepted identifiers",
     "They authenticate the sender of each frame before it is stored",
     "They encrypt the payload of every frame that the node accepts"
   ],
   "Filters compare received identifiers against configured values and masks. A filter that is too wide still passes frames the software must discard, and one that is too narrow loses needed data. Filter configuration is part of the interface design and should be verified."],
  ["A CAN message set is analysed with response-time analysis. Which input is essential?",
   null,
   [
     "Period, stuffed length, priority, and blocking by one lower-priority frame",
     "Only the average bus load, measured over one second of traffic",
     "The colour and the length of the cable used for the bus",
     "The compiler version that was used to build the drivers"
   ],
   "CAN is non-pre-emptive: a frame in progress cannot be interrupted, so each message may be blocked by one longer lower-priority frame. Average utilisation hides worst-case delays, and the analysis must include errors and retransmissions if required."],
  ["Which statement about RS-485 is correct?",
   null,
   [
     "A differential multi-drop layer with termination and a defined idle level",
     "A single-ended link that is limited to a few metres of cable",
     "A link with built-in bitwise arbitration, like CAN",
     "A complete protocol that includes the message format and addressing"
   ],
   "RS-485 specifies only the electrical layer. The protocol (for example Modbus RTU) defines framing and who talks when. Transmit-enable direction control and turn-around timing must be handled in software or by the UART hardware."],
  ["In an RS-485 half-duplex link, why can the last byte of a message be corrupted if the transmitter is disabled right after writing the last byte to the UART data register?",
   null,
   [
     "The last byte may still be shifting out, so wait for transmission complete",
     "The UART is not able to send a final byte after the buffer empties",
     "The line already carries a parity bit for that last byte",
     "RS-485 transceivers always drop the last byte of a frame"
   ],
   "A 'transmit data register empty' flag means the buffer is free, not that the byte has left the shift register. Use the transmission-complete flag (or a hardware direction-control feature) before switching to receive."],
  ["What does a bias network on an RS-485 bus do?",
   null,
   [
     "It forces a known idle level when no driver is active",
     "It raises the baud rate that the link can support",
     "It replaces the line termination at both ends of the bus",
     "It supplies power to the nodes over the bus pair"
   ],
   "With all drivers off, the differential voltage floats. Pull-up and pull-down resistors (at one point on the bus) keep the line in the idle state. Where the transceiver has fail-safe biasing built in, check the datasheet."],
  ["Which statement describes the LIN bus?",
   null,
   [
     "A single-wire bus where the master's schedule table sends each frame header",
     "A high-speed multi-master bus with bitwise arbitration",
     "A time-triggered dual-channel bus for brake-by-wire systems",
     "A wireless protocol for body electronics in vehicles"
   ],
   "LIN uses one master that sends frame headers, and the selected slave responds. Timing is deterministic by design but slow (about 20 kbit/s at most in typical use), so it is used for body electronics rather than for fast control loops."],
  ["Which statement about the ARINC 429 word format is correct?",
   null,
   [
     "32 bits: 8-bit label, SDI, data, SSM and an odd parity bit",
     "64 bits that are protected by a CRC over the whole word",
     "16 bits that are protected by a single even parity bit",
     "A variable-length packet that starts with a length field"
   ],
   "Bits 1–8 are the label (an octal identifier of the parameter), bits 9–10 the source/destination identifier, then data, the sign/status matrix, and bit 32 for odd parity. Check the current ARINC 429 specification for details such as the bit ordering."],
  ["What is the meaning of the Sign/Status Matrix (SSM) in an ARINC 429 word?",
   null,
   [
     "It conveys the validity or status of the data in the word",
     "It carries the label that identifies the parameter",
     "It holds the checksum of the data bits in the word",
     "It selects the baud rate that the bus uses"
   ],
   "Receivers use the SSM to decide whether the data can be used. A system design must define what happens for each SSM state (hold last value, use a default, raise a fault), and tests should cover them."],
  ["What is the data rate specified for ARINC 429?",
   null,
   [
     "Low speed (about 12 to 14.5 kbit/s, verify) and high speed (about 100 kbit/s)",
     "Exactly 1 Gbit/s for every ARINC 429 bus",
     "Only 10 Mbit/s, the same as standard Ethernet",
     "Only 9.6 kbit/s, the same as a basic serial line"
   ],
   "ARINC 429 defines a high-speed and a low-speed rate. I recommend verifying the exact figures in the current specification before using them in a design or document."],
  ["In MIL-STD-1553B, what does a Remote Terminal (RT) do?",
   null,
   [
     "It answers Bus Controller commands and cannot start a transfer itself",
     "It controls all transfers that take place on the bus",
     "It only records bus traffic and never answers any command",
     "It routes messages between two buses, acting as a switch"
   ],
   "The Bus Controller initiates every transfer. Remote Terminals respond with a status word and data, and a Bus Monitor only records. This command/response scheme gives deterministic timing and a single point of control."],
  ["How is redundancy usually provided in MIL-STD-1553B systems?",
   null,
   [
     "Two independent buses (A and B), with a switch-over after a failed transfer",
     "A single bus with no fall-back path and a spare terminal",
     "Wireless back-up links between the remote terminals",
     "Time-triggered replicas that run on the same bus"
   ],
   "Dual-redundant bus architecture is typical, and the BC retries on the alternate bus according to its rules. A design must specify retry and bus-switching behaviour, and the fault handling must be tested."],
  ["What is an AFDX 'virtual link' (VL)?",
   null,
   [
     "A one-way logical channel with reserved bandwidth and a maximum frame size",
     "A wireless link that connects two switches in the network",
     "A physical cable that connects an end system to a switch",
     "A TCP connection that retransmits any frame that is lost"
   ],
   "Virtual links give each flow a bounded bandwidth, so the worst-case latency can be computed. Switches police the flows. Critical data flows use dedicated VLs, which is the basis for deterministic behaviour."],
  ["Why does AFDX send each frame on two redundant networks (A and B)?",
   null,
   [
     "The receiver uses the first valid copy, so one network can fail",
     "It doubles the data rate that each virtual link can carry",
     "It encrypts the data by splitting it between the two networks",
     "It reduces the power that the switches draw from the supply"
   ],
   "End systems send duplicate frames on both networks. The receiver's redundancy management uses the sequence number to remove duplicates and select the first valid frame. Integrity checking and fault reporting complete the function."],
  ["Which property does TCP lack that makes it unsuitable for hard real-time avionics control traffic?",
   null,
   [
     "Bounded latency: retransmission and congestion control make the delay variable",
     "Ordered delivery of the bytes that are sent",
     "Port numbers that separate the applications on a node",
     "Support for IP addressing between the end systems"
   ],
   "TCP gives reliability by retransmission, which introduces unbounded delay in the presence of loss. Real-time systems use bounded-latency mechanisms (such as AFDX virtual links or time-triggered protocols) and handle loss at the application level."]
]);
window.QUIZ_ADD("comm", [
  ["What is end-to-end (E2E) protection in a safety-related communication?",
   null,
   [
     "Extra data (CRC, counter, data ID) that the receiver checks end to end",
     "A stronger cable between the two communicating endpoints",
     "A larger payload in every message that is transmitted",
     "Encryption of the physical layer only, with no extra checks"
   ],
   "E2E checks run at the application endpoints, so they also cover faults in gateways, drivers and buffers that lower-level CRCs cannot see. The receiver must define the reaction to each detected fault (discard, use the last good value, enter a degraded mode)."],
  ["A message includes an alive counter that increments with each transmission. What failure does it detect that a CRC alone does not?",
   null,
   [
     "A stale or repeated message, whose old CRC is still valid",
     "A bit flip in the payload that the CRC already catches",
     "A wrong baud rate between the sender and the receiver",
     "A missing ground connection between the two units"
   ],
   "The CRC verifies content, not freshness. A frozen sender can transmit valid frames with unchanging data. The counter lets the receiver see that the sequence has not advanced, and a timeout detects loss entirely."],
  ["For a safety message, which detection is NOT provided by a CRC over the payload alone?",
   null,
   [
     "Detection of the wrong sender or the wrong order",
     "Detection of random bit errors in the covered bytes",
     "Detection of burst errors up to the CRC length",
     "Detection of corrupted payload bytes"
   ],
   "A payload CRC detects corruption within the protected bytes. Sender identity, order, repetition and timeliness need other elements, such as a data ID inside the CRC calculation, a sequence counter and a timeout."],
  ["Which statement about checksums versus CRCs is correct?",
   null,
   [
     "A good CRC detects all bursts up to its width, which a plain sum cannot",
     "An additive checksum detects every case of swapped bytes in a message",
     "A CRC cannot detect single-bit errors, only longer bursts",
     "A CRC always corrects the errors that it finds in a message"
   ],
   "A simple sum cannot detect swapped bytes, and it is weak against several compensating errors. A good CRC polynomial gives stronger, mathematically analysable detection. Both only detect errors, and correction needs an error-correcting code."],
  ["What does the Hamming distance of a code describe?",
   null,
   [
     "The minimum number of bit differences between any two valid code words",
     "The number of bits that a message contains in total",
     "The physical length of the cable that carries the message",
     "The baud rate at which the link carries the message"
   ],
   "A distance of d detects up to d − 1 bit errors and corrects up to ⌊(d − 1)/2⌋. Protocol designers choose CRC polynomials by their Hamming distance for the given message length."],
  ["Which framing method lets a receiver resynchronise on a byte stream after losing data, using a delimiter that cannot appear in the payload?",
   null,
   [
     "Byte stuffing or an encoding such as COBS or SLIP, so the delimiter is unique",
     "Sending the data with no markers between the frames",
     "A length field only, with no further check on the frame",
     "Using a different baud rate for each frame"
   ],
   "A length field alone cannot resynchronise after a corrupted length. Delimiters with escaping (SLIP, HDLC-style) or COBS make frame boundaries recoverable. The framing code needs robustness tests with corrupted and truncated input."],
  ["A receiver parses a length-prefixed message. What is the most important check before using the length?",
   null,
   [
     "That it fits the buffer and the number of bytes actually received",
     "That the length is an even number of bytes",
     "That the length is stored in a floating-point variable",
     "That the length is written to a log before it is used"
   ],
   "An unchecked length lets a malformed or malicious message cause buffer overflows or over-reads. Bounds checks are standard for all external input, and robustness tests (zero, maximum, maximum + 1, truncated frames) should cover them."],
  ["What does a timeout supervise in a request/response protocol?",
   null,
   [
     "That a response arrives in time, or a defined error action follows",
     "That the CRC of the response is correct",
     "That the baud rate of the link stays correct",
     "That the cable has the right colour"
   ],
   "Without a timeout, a lost response blocks the requester. The timeout value follows from the worst-case latency analysis, and the number of retries and their effect on the timing are part of the design."],
  ["A sender retries a message three times after a timeout. What problem must the protocol handle at the receiver?",
   null,
   [
     "Duplicates, since only the acknowledgement may have been lost",
     "None, because duplicates cannot occur on a retried message",
     "The receiver must reboot after the third retry",
     "The sender must lower its baud rate for each retry"
   ],
   "Retransmission gives at-least-once delivery. If the command is not idempotent (for example 'increment') a duplicate gives the wrong effect. Sequence numbers or transaction IDs let the receiver detect repetition."],
  ["What is the effect of network byte order (big-endian) conventions on a little-endian MCU?",
   null,
   [
     "Convert multi-byte fields explicitly with shifts or `ntohl`-style calls",
     "No conversion is ever needed between the two byte orders",
     "The MCU becomes big-endian automatically for network data",
     "Only the 8-bit fields of a message are affected"
   ],
   "Casting a byte buffer to a `uint32_t *` uses the host byte order and can be misaligned. Explicit field-by-field serialisation with defined endianness is portable and verifiable."],
  ["Which statement about Ethernet frames is correct?",
   null,
   [
     "Up to 1500 bytes of payload plus a 32-bit frame check sequence",
     "At most 8 bytes of payload in each frame",
     "No error detection at all in the frame",
     "Always exactly 64 bytes of payload, padded if short"
   ],
   "Ethernet has a 32-bit FCS. Frames shorter than the minimum (64 bytes including headers and FCS) are padded. Jumbo frames are an extension that must be supported by every device on the path."],
  ["Why is UDP often chosen over TCP for periodic sensor data in a real-time system?",
   null,
   [
     "No retransmission delay: a lost sample is replaced by the next one",
     "UDP guarantees the delivery of every datagram to the receiver",
     "UDP guarantees the ordering of all datagrams it carries",
     "UDP provides encryption of the payload by default"
   ],
   "For periodic data, an old retransmitted value is worse than a new one. UDP shifts reliability decisions to the application, which can use sequence numbers, validity flags and timeouts."],
  ["What is the effect of a Modbus RTU master sending a request and getting no answer?",
   null,
   [
     "It waits for a timeout, then retries or reports an error",
     "The slave always replies immediately, even if it is busy",
     "The master receives a broadcast acknowledgement",
     "The master must switch over to a CAN link"
   ],
   "Modbus is master/slave. Broadcast requests are not answered at all. RTU frame ends are detected by silent intervals and a 16-bit CRC. Check the current Modbus specification for the timing details."],
  ["Which SPI configuration issue most often causes every received byte to be shifted by one bit?",
   null,
   [
     "A mismatch of clock phase or polarity between master and slave",
     "A mismatch of the stop-bit setting between the two devices",
     "A mismatch of the parity setting between the two devices",
     "A mismatch of the message identifiers used by the two devices"
   ],
   "The slave samples on a different edge from the one on which the master drives data, so values appear shifted. Read the slave's timing diagram and set CPOL/CPHA accordingly."],
  ["What is a typical cause of an SPI slave that returns garbage only when several slaves are connected?",
   null,
   [
     "A deselected slave not releasing MISO, or a chip-select glitch",
     "The clock is too fast for the colour of the cable",
     "There are too many bits in the identifier of each frame",
     "The CPU has too much RAM for the number of slaves"
   ],
   "Bus contention or a chip-select that toggles during a transaction gives corrupted data. Check the chip-select hold and setup times and the slave's MISO tri-state behaviour."],
  ["In I2C, how does a master recognise that the slave has acknowledged a byte?",
   null,
   [
     "The slave pulls SDA low during the ninth clock pulse",
     "The slave holds SCL low permanently after each byte",
     "The slave sends a CRC byte after the data",
     "The master receives an interrupt from the cable"
   ],
   "After each 8 bits, the receiver pulls SDA low (ACK) on the ninth clock. A high level (NACK) means no acknowledgement. Masters must handle NACK as a defined error and not just continue."],
  ["Which condition ends an I2C transaction and releases the bus?",
   null,
   [
     "A STOP condition: SDA rising while SCL is high",
     "A START condition: SDA falling while SCL is high",
     "SCL held low for a long time",
     "Two ACK bits in a row"
   ],
   "START is SDA falling while SCL is high, and STOP is SDA rising while SCL is high. A repeated START lets the master change direction without releasing the bus, which keeps other masters out."],
  ["Which I2C feature allows more than one master on the bus?",
   null,
   [
     "Arbitration: a master that sends 1 but sees 0 on SDA loses",
     "Clock stretching by the slaves on the bus",
     "A repeated START condition between two transfers",
     "A 10-bit slave address in the first byte"
   ],
   "I2C is multi-master capable through wired-AND arbitration of the data line (with clock synchronisation). Many controllers do not implement it, and software must handle 'arbitration lost' when it can occur."],
  ["For time-triggered protocols such as TTEthernet, TTP or the FlexRay static segment, what is the key property?",
   null,
   [
     "Transmission in predefined slots taken from a global schedule",
     "Nodes compete for access to the bus at random times",
     "Lost messages are retransmitted automatically by the sender",
     "No clock synchronisation is needed between the nodes"
   ],
   "A shared global time and a fixed schedule remove arbitration jitter. The cost is the need for clock synchronisation and a carefully engineered schedule."],
  ["When two sensors on different buses must be fused, why is a common time base important?",
   null,
   [
     "Clocks drift and have offsets, so fused data may describe different instants",
     "It is not important for sensor fusion, since values are fused anyway",
     "It lengthens the CAN identifier that each frame carries",
     "It reduces the number of bits per byte that are sent"
   ],
   "Fusing values from different instants adds an error proportional to the rate of change and the time skew. Use synchronised time (for example a distributed clock protocol) or timestamp at the hardware capture."],
  ["What is a 'babbling idiot' failure in a communication system, and what is the classic mitigation?",
   null,
   [
     "A node transmits too much or at the wrong time; a guardian gates its driver",
     "A node that receives too slowly, so more RAM is added",
     "A node with no power, so a battery is added",
     "A node that uses the wrong colour of cable"
   ],
   "A faulty node that transmits uncontrolled can take down a shared bus. Time-triggered networks use a bus guardian that only opens the driver in its own slot, and CAN systems use bus-off handling and independent diagnostics."]
]);
window.QUIZ_ADD("comm", [
  ["What does the ISO-TP (ISO 15765-2) transport layer do on a CAN bus?",
   null,
   [
     "It splits long messages into frames and adds flow control",
     "It raises the CAN bit rate when a message is large",
     "It replaces bus arbitration for long messages",
     "It encrypts every frame that it sends"
   ],
   "Classic CAN carries 8 data bytes per frame, so diagnostic services and large transfers use a segmentation layer. The receiver controls the sender's pace with flow-control frames (block size and separation time). Check the standard for the exact frame formats and timing parameters."],
  ["What is a gateway's main risk to end-to-end timing and integrity when it forwards frames between two networks?",
   null,
   [
     "Added delay and jitter, possible loss, and corruption that CRCs miss",
     "None, because gateways add no delay to the traffic",
     "It changes the baud rate of both networks permanently",
     "It removes the need for any timeouts in the system"
   ],
   "Each hop adds buffering and processing delay. A frame can also be corrupted in the gateway's memory after the first network's CRC check and before the second CRC is computed, so application-level protection is needed."],
  ["Bus load on a 500 kbit/s CAN bus is calculated from message periods and frame lengths. Which input is often forgotten and makes the estimate too low?",
   null,
   [
     "Bit-stuffing overhead and the inter-frame space",
     "The length and quality of the cable used on the bus",
     "The compiler version used for the drivers",
     "The CPU frequency of the nodes on the bus"
   ],
   "Nominal frame lengths understate the real time on the bus. A conservative analysis uses the worst-case stuffed length and the inter-frame space. A load target (for example below a certain percentage) is a design rule that should be justified."],
  ["On a UART link, what does hardware flow control with RTS/CTS do?",
   null,
   [
     "The receiver tells the sender to pause when its buffer is nearly full",
     "The receiver encrypts the data that it passes to the sender",
     "The receiver raises the baud rate used by the sender",
     "The receiver appends a CRC to the frames of the sender"
   ],
   "RTS/CTS prevents data loss when the receiver cannot keep up. The assertion threshold must leave room for bytes already in flight. Software flow control (XON/XOFF) uses in-band characters and is less reliable for binary data."],
  ["A UART receives variable-length frames and the firmware wants one interrupt per frame, not per byte. Which hardware feature helps?",
   null,
   [
     "Idle-line detection with DMA, firing after one quiet frame time",
     "A larger baud rate, so that each frame ends sooner",
     "A parity bit on every received byte of the frame",
     "A bigger stack for the receive interrupt handler"
   ],
   "The idle interrupt marks the end of a burst, and DMA stores the bytes. The code then reads the number of transferred bytes. The frame detection still needs a validity check (length, CRC), because idle gaps can also occur inside a damaged frame."],
  ["A long RS-232 link has random errors near a motor drive. Which hardware change most improves noise immunity?",
   null,
   [
     "Switch to RS-485 with shielded twisted pair, or add galvanic isolation",
     "Increase the baud rate to shorten the time exposed to noise",
     "Remove the parity bit to reduce the overhead of each frame",
     "Use a thinner wire to lower the capacitance of the cable"
   ],
   "Single-ended signalling is sensitive to common-mode noise and ground shifts. Differential signalling rejects common-mode interference, and isolation removes ground loops. This is a system design decision, not something software alone can solve."],
  ["Why can a ground potential difference between two units damage or disturb a single-ended serial link?",
   null,
   [
     "The receiver sees the signal plus the ground offset, which can exceed its limits",
     "Ground has no effect on a serial link, since only the signal wire matters",
     "A ground offset changes only the baud rate that the receiver detects",
     "A ground offset changes only the parity that each frame carries"
   ],
   "Signals are referenced to ground. A voltage offset between grounds adds to the signal and can cause errors or overstress. Isolation or differential links address this."],
  ["A requirement says 'the system shall detect loss of the speed message within 50 ms'. The message period is 10 ms. Which design is appropriate?",
   null,
   [
     "A receive timeout that declares loss within 50 ms, with a defined fall-back",
     "Wait for the next reset of the receiving unit",
     "Ignore the missing message and keep the old value for ever",
     "Use a stack canary on the receiving task"
   ],
   "The timeout threshold must be chosen from the period, the jitter, the allowed false-alarm rate and the 50 ms limit. Test it by removing the message at runtime and measuring the reaction time."],
  ["Why are Interface Control Documents (ICDs) important in avionics software projects?",
   null,
   [
     "They define formats, units, scaling, ranges, timing and error handling",
     "They define the compiler options and the build setup for each unit",
     "They replace the software requirements document for the equipment",
     "They are needed only for the hardware design of the equipment"
   ],
   "Consistent interpretation of signals across systems is vital. ICD content traces to requirements, drives the data and control coupling analysis, and is the base for interface tests, so changes need controlled configuration management."],
  ["A signal is defined as a 16-bit unsigned integer with scale 0.01 and offset -40 (physical = raw × 0.01 − 40). What is the physical value for raw 0x1388 (5000)?",
   null,
   ["10.0",
    "50.0",
    "-40.0",
    "5000.0"],
   "5000 × 0.01 = 50.0, and 50.0 − 40 = 10.0. Check conversions with known test vectors in both directions, and define the rounding rules and invalid-value codes in the ICD."],
  ["What can go wrong if two teams interpret an ICD field as signed and unsigned respectively?",
   null,
   [
     "Large values flip sign or size yet can pass the CRC and range checks",
     "Nothing goes wrong, since the bits are identical on both sides",
     "The bus stops working after the first message of that type",
     "The CRC fails on every message that the sender transmits"
   ],
   "The bits arrive intact but the meaning differs. Range checks, explicit units and cross-team interface tests (including boundary values) catch the mismatch."],
  ["A receiver gets a message whose value is outside the specified physical range but whose CRC is correct. What should a robust design do?",
   null,
   [
     "Treat it as invalid, apply the specified fall-back and report it",
     "Use the value as received, because the CRC passed",
     "Use half of the received value, as a compromise",
     "Reset the entire system each time such a value arrives"
   ],
   "The CRC proves transmission integrity only. A plausibility check protects against sender faults, wrong scaling and corrupted internal data. The handling must be specified and tested."],
  ["What is a 'black channel' approach in safety communication?",
   null,
   [
     "The safety layer treats the transport as untrusted and adds its own checks",
     "A channel on which no light or radio signal is used at all",
     "A hidden debug link into the safety unit for test engineers",
     "A channel that has been certified never to fail in service"
   ],
   "The black-channel principle lets safety-related data cross standard networks by protecting it end to end in the safety layer. The assumptions about the residual error rate of the channel must be justified."],
  ["What type of test best checks the robustness of a protocol parser against malformed input?",
   null,
   [
     "Fault-injection and fuzz tests with truncated and corrupted frames",
     "Only tests that use valid frames at the nominal rate",
     "A review of the code comments in the parser module",
     "A power cycle test of the receiving unit"
   ],
   "Normal-range tests show correct operation; robustness tests show that invalid input is handled without crashes, hangs or memory corruption. For DO-178C these are requirements-based robustness cases, where the requirements specify the behaviour."],
  ["What is a protocol state machine's most important design property for robustness?",
   null,
   [
     "Every state defines behaviour for every event, with no deadlock states",
     "It has as many states as possible, so control is detailed",
     "It keeps its state only in global variables of the module",
     "It never leaves its first state after start-up"
   ],
   "Unspecified event/state combinations become silent undefined behaviour. A complete transition table, with a defined error or ignore action, makes the logic verifiable and gives structural coverage a clear target."],
  ["Which statement is correct about I2C bus capacitance and speed?",
   null,
   [
     "Higher capacitance slows the rising edges and limits the speed",
     "Capacitance has no effect on I2C timing, only on power use",
     "Capacitance matters only for SPI buses, not for I2C",
     "More capacitance makes the bus edges sharper and the bus faster"
   ],
   "The rise time is roughly proportional to the pull-up resistance times the bus capacitance, and the I2C specification limits it for each mode. Long wires and many devices increase capacitance, so a buffer or a lower speed may be needed."],
  ["What is IEEE 1588 PTP used for in a networked embedded system?",
   null,
   [
     "Synchronising clocks across devices, using hardware timestamps",
     "Encrypting frames between two devices on the same network",
     "Routing messages between two separate networks",
     "Compressing data before it is sent over the link"
   ],
   "PTP exchanges timestamped messages to estimate offset and delay. Achievable accuracy depends on hardware timestamping and on how symmetric the network delays are, so verify the figures for a specific design."],
  ["What does Time-Sensitive Networking (IEEE 802.1Qbv time-aware shaping) add to Ethernet?",
   null,
   [
     "Scheduled gates open each queue at set times, bounding the latency",
     "A bigger payload for every Ethernet frame on the link",
     "A new connector type for the Ethernet cable",
     "Automatic code generation for the protocol stack"
   ],
   "TSN extends standard Ethernet with timing mechanisms. Time-aware shaping depends on synchronised clocks and a computed schedule. Check which TSN profiles and features your devices support."],
  ["Which statement about USB or any host-controlled bus is relevant to hard real-time embedded design?",
   null,
   [
     "The host schedules the transfers, so latency depends on the host",
     "Latency is always below 1 microsecond on such a bus",
     "Devices can talk at any time they choose to",
     "It has no framing of the data at all"
   ],
   "A polled host-controlled bus gives timing set by the host's schedule. Safety-critical control loops usually use a bus with deterministic access instead, or add application-level supervision."],
  ["Why should serialisation code avoid sending a `struct` by `memcpy` of the whole object between different software versions?",
   null,
   [
     "Padding, order and field sizes may change and break compatibility",
     "`memcpy` is not allowed in C programs for safety reasons",
     "Structs cannot be copied from one place to another in C",
     "It makes the transferred data encrypted by default"
   ],
   "A defined wire format with explicit offsets and a version field remains stable when internal structures change. Compatibility rules should be part of the ICD."],
  ["Which approach limits the effect of a corrupted message stream on a parser's memory use?",
   null,
   [
     "Use fixed-size buffers, and drop or reset the parser on overflow",
     "Allocate memory for each length that is received",
     "Ignore the length field in the message completely",
     "Store everything in a growing list of segments"
   ],
   "Allocating by an untrusted length gives denial-of-service or fragmentation. A bounded static buffer makes the worst-case memory visible and testable."]
]);
window.QUIZ_ADD("comm", [
  ["Two ARINC 429 transmitters must not be connected to the same wire pair. Why?",
   null,
   [
     "It has a single transmitter, so a second driver causes contention",
     "It supports multi-master arbitration between transmitters",
     "A second transmitter is needed on the pair for redundancy",
     "The wire pair is too thin to carry two drivers"
   ],
   "Each ARINC 429 bus has exactly one transmitter and up to a limited number of receivers (check the specification for the count). Bidirectional exchange uses a second bus in the other direction."],
  ["What does the label field of an ARINC 429 word identify?",
   null,
   [
     "The type of parameter, such as altitude, usually written in octal",
     "The serial number of the sending equipment",
     "The CRC of the whole 32-bit word",
     "The transmission priority of the word on the bus"
   ],
   "Labels are assigned in the ARINC 429 specification and equipment-specific documents. A receiver selects what to do with a word by its label, and the data format that follows (BNR, BCD, discrete) depends on the label definition."],
  ["How is odd parity used in ARINC 429?",
   null,
   [
     "The bit makes the count of 1 bits in the word odd",
     "It corrects single-bit errors anywhere in the word",
     "It is a 16-bit CRC computed over the whole word",
     "It is applied only to the label field"
   ],
   "A single parity bit detects any odd number of bit errors but not an even number, and it cannot locate or correct them. Many systems add application checks such as range, rate-of-change and timeouts."],
  ["On a MIL-STD-1553B bus, what is the role of the Bus Monitor?",
   null,
   [
     "It records the traffic without taking part in it",
     "It controls all transfers that take place on the bus",
     "It switches between the two redundant buses",
     "It acts as a remote terminal for the bus controller"
   ],
   "A bus monitor is passive. It is used for data recording and test. Only the Bus Controller initiates transfers."],
  ["What is the basic structure of a MIL-STD-1553B word?",
   null,
   [
     "20 bits: 3 sync bits, 16 information bits and 1 odd parity bit",
     "32 bits that are protected by a CRC over the data",
     "8 bits with a single even parity bit",
     "A variable-length frame that starts with a length field"
   ],
   "Command, status and data words share this structure and differ in the sync pattern. The bit rate is 1 Mbit/s. As always, confirm the details against the standard."],
  ["What is the purpose of the transformer coupling used on MIL-STD-1553 buses?",
   null,
   [
     "Galvanic isolation and common-mode noise rejection",
     "An increase of the data rate that the bus can carry",
     "Generation of the clock for each remote terminal",
     "Provision of a CRC for each word on the bus"
   ],
   "Transformer coupling isolates each terminal electrically and improves fault tolerance, for example against a short in one terminal's stub. Stub lengths and coupling type are specified in the standard."],
  ["How does a 1553 Bus Controller detect that a Remote Terminal did not respond?",
   null,
   [
     "It sees no status word in time and applies its retry policy",
     "The RT raises a dedicated interrupt line to the controller",
     "It receives an error report from the bus monitor",
     "It waits indefinitely for the missing response"
   ],
   "A missing response is detected by a no-response timeout. The BC's policy (retry on the same bus, on the alternate bus, mark the RT as failed) must be defined in the requirements and tested."],
  ["Which parameter of an AFDX virtual link limits how often a flow may send frames?",
   null,
   [
     "The BAG, the minimum interval between frames of the link",
     "The length of the MAC address of the end system",
     "The length of the cable between the end system and switch",
     "The number of sub-virtual-links that the link uses"
   ],
   "The BAG and the maximum frame length define the bandwidth of each VL. Traffic shaping at the end system and policing in the switch keep the flows within the contract, so latency bounds can be computed by network calculus."],
  ["In AFDX, what is the function of 'jitter' limits at the end system?",
   null,
   [
     "They bound how far send times may deviate from the schedule",
     "They define how many cables the end system must use",
     "They set the size of the payload in each frame",
     "They control the status LEDs of the switch"
   ],
   "Maximum allowed jitter at the source is part of the VL contract and is used in the end-to-end latency analysis. Software that schedules sends must respect it."],
  ["Which statement distinguishes ARINC 653 sampling ports from queuing ports for inter-partition communication?",
   null,
   [
     "A sampling port keeps the latest message; a queuing port buffers in FIFO order",
     "A sampling port queues all messages, and a queuing port keeps only one",
     "Both port types behave in exactly the same way",
     "Sampling ports exist only for hardware access"
   ],
   "Sampling ports suit periodic status data where only the latest value matters, and queuing ports suit event or command streams that must not be lost. The refresh-period attribute gives the validity of sampled data."],
  ["A message has a 10 ms period and the receiver runs a 20 ms task. What is the worst-case effect on data age?",
   null,
   [
     "Data can be about one receive period plus the receiver's period old",
     "There is no effect on the age of the data at all",
     "The data always arrives early at the consumer task",
     "The data is always newer than 1 ms at the consumer"
   ],
   "Latency across sampling and delays adds up. End-to-end timing analysis considers the producer period, network latency and consumer period. Mismatched rates cause aliasing or unused samples."],
  ["Why can a receiver that is slower than the producer lose messages even if the bus has spare capacity?",
   null,
   [
     "The queue overflows when messages arrive faster than they are removed",
     "Messages disappear on their own after some time in the queue",
     "The CRC of the messages is faulty on a busy bus",
     "The cable is too long for the bit rate in use"
   ],
   "Buffer sizing is part of interface design. If overflow can occur, the behaviour (drop oldest, drop newest, flag overflow) must be defined and tested, and counters should record it."],
  ["What is the usual relationship between CAN bit rate and maximum bus length?",
   null,
   [
     "A higher bit rate needs a shorter bus (about 40 m at 1 Mbit/s, verify)",
     "A higher bit rate allows a longer bus, as signals travel faster",
     "They are independent of each other, so any length works",
     "Length is limited only by the CRC that the frames carry"
   ],
   "The signal must travel along the bus and back within a fraction of the bit time for arbitration to work. Commonly quoted rules of thumb depend on the transceiver and cable, so check the specification and use bit-timing calculations for the actual network."],
  ["A CAN controller reports many 'bit errors' only when the bus load is high. Which cause is most plausible?",
   null,
   [
     "Marginal signal quality or bit timing shows up with more traffic",
     "Too many task priorities configured in the node",
     "A watchdog setting in the CAN controller",
     "The PWM duty cycle of an output on the node"
   ],
   "Bit errors appear when the node reads a level different from what it sent. Poor termination or timing that is only just acceptable shows up more often with many transitions. Measure the bus with an oscilloscope and check the sampling point configuration."],
  ["What is the effect of mixing nodes with different CAN bit-timing sample points on one bus?",
   null,
   [
     "It can be acceptable if each setting is valid, but it needs verifying",
     "It always works without any analysis of the delays",
     "It always fails on a shared bus with mixed settings",
     "It changes the identifiers of the frames on the bus"
   ],
   "Networks normally specify one bit timing (rate and sampling point range). Deviations need an analysis of delay and oscillator tolerance. Some standards fix the sampling point for all nodes."],
  ["Why does a node with an inaccurate oscillator (for example an unbuffered RC) cause problems on CAN?",
   null,
   [
     "Its bit timing deviates, so it can exceed the resynchronisation limit",
     "CAN does not need accurate clocks, since edges resynchronise",
     "It changes the identifiers of the frames that it sends",
     "It reduces the voltage on the bus for all nodes"
   ],
   "CAN controllers tolerate only a limited oscillator tolerance (the allowed value depends on bit-timing settings). Crystal or ceramic resonators are normally required. Check the specification for the tolerance calculation."],
  ["How can software verify that a received SPI flash or sensor frame is complete when the protocol has no CRC?",
   null,
   [
     "Use known-answer reads, plausibility checks, or a higher-layer CRC",
     "Assume it is always complete, since SPI has no errors",
     "Check only the first byte that was received",
     "Check the compiler version that built the driver"
   ],
   "The bus itself provides no error detection in plain SPI. Checks at application level compensate, for example by reading identification registers at start-up and repeating critical reads."],
  ["What does a negative acknowledgement (NACK) from an I2C slave during a write mean for the master?",
   null,
   [
     "The slave did not accept the byte; stop or retry by its rules",
     "The transfer succeeded and the slave is ready for more",
     "The bus is switching to 400 kHz mode for the next byte",
     "The master must continue writing the next byte"
   ],
   "Many devices NACK while busy (for example during an internal EEPROM write cycle) and accept again later (acknowledge polling). Others NACK for bad commands. The requirement should define retries and limits."],
  ["Why is the order of byte transmission in a multi-byte field part of the interface specification?",
   null,
   [
     "Endianness may differ, and a wrong assumption reverses the value",
     "Byte order never matters on the wire between two nodes",
     "Only the compiler decides the byte order on the wire",
     "It only affects text strings and never numbers"
   ],
   "Serialisation is explicit: define the byte order, the field layout and the alignment, and test with both example values and boundary values at the interface."],
  ["Which method best proves that a communication interface meets its timing requirement under maximum load?",
   null,
   [
     "Worst-case analysis plus stress tests with fault injection on the target",
     "A single test at idle load on the target",
     "A review of the source comments in the driver",
     "The average latency taken from one run"
   ],
   "Average values do not show worst cases. Analysis gives the bound, and stress tests check that the analysis assumptions are valid. Record the configuration and the conditions."],
  ["What is the reason to test a protocol stack with a frame whose CRC is correct but whose content violates the specification?",
   null,
   [
     "To confirm the receiver does not rely on the CRC alone",
     "To test the CRC hardware of the controller",
     "To increase the bus load during the test",
     "To check the baud rate of the link"
   ],
   "Semantic errors, for example reserved values or impossible combinations, can come from a faulty sender or corrupted memory before the CRC was computed. Robust receivers check them."],
  ["A system uses UART at 3 Mbaud with an MCU running at 8 MHz. What is the likely problem?",
   null,
   [
     "The baud generator may not produce 3 Mbaud accurately from the clock",
     "UART cannot run above 9600 baud under any condition",
     "There is no problem at any clock frequency",
     "The baud rate is set by the parity bit of the frame"
   ],
   "The achievable baud rates are integer divisions of the peripheral clock (with some oversampling). A rate that needs a divisor below one or has a large fractional error gives framing errors. Calculate the actual error from the reference manual's formula."]
]);
window.QUIZ_ADD("comm", [
  ["In a request/response protocol over an unreliable link, why should each request carry a unique sequence or transaction ID?",
   null,
   [
     "So the requester can match a response and ignore late or duplicate ones",
     "To make every frame longer and so easier to detect",
     "To select the baud rate of the link at run time",
     "To replace the CRC of the frame"
   ],
   "After a timeout and retry, a late response to the first request can arrive and be mistaken for the answer to the second. A transaction ID separates them. This also supports duplicate detection at the responder."],
  ["Which statement about a checksum of the whole message including its own checksum field is correct?",
   null,
   [
     "Exclude the field or set it to a defined value while computing",
     "Including it makes the checksum self-correcting",
     "It must always be computed twice, once by each side",
     "It makes the protocol faster on the link"
   ],
   "Sender and receiver must compute over identical bytes. Many protocols define that the CRC covers everything before it, or that the verification of the whole message including the CRC gives a fixed residue. Misunderstanding this is a common interoperability bug."]
]);
