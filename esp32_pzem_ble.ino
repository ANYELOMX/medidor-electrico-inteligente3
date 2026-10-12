#include <Arduino.h>
#include <PZEM004Tv30.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define PZEM_RX 16
#define PZEM_TX 17
#define PZEM_SERIAL Serial2

const char* SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
const char* CHARACTERISTIC_UUID = "12345678-1234-5678-1234-56789abcdef1";

PZEM004Tv30 pzem(PZEM_SERIAL, PZEM_RX, PZEM_TX);
BLECharacteristic* characteristic;

void setup() {
  Serial.begin(115200);
  PZEM_SERIAL.begin(9600, SERIAL_8N1, PZEM_RX, PZEM_TX);
  BLEDevice::init("Medidor-ESP32");
  BLEServer* server = BLEDevice::createServer();
  BLEService* service = server->createService(SERVICE_UUID);
  characteristic = service->createCharacteristic(CHARACTERISTIC_UUID, BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  characteristic->addDescriptor(new BLE2902());
  characteristic->setValue("ESP32 listo");
  service->start();
  BLEAdvertising* advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->setScanResponse(true);
  BLEDevice::startAdvertising();
  Serial.println("Medidor-ESP32 listo. Abre la pagina y pulsa Conectar ESP32.");
}

void loop() {
  float voltage = pzem.voltage();
  float current = pzem.current();
  float power = pzem.power();
  float energy = pzem.energy();
  float frequency = pzem.frequency();
  float pf = pzem.pf();

  if (isnan(voltage)) voltage = 0;
  if (isnan(current)) current = 0;
  if (isnan(power)) power = 0;
  if (isnan(energy)) energy = 0;
  if (isnan(frequency)) frequency = 0;
  if (isnan(pf)) pf = 0;

  char payload[180];
  snprintf(payload, sizeof(payload), "{\"voltage\":%.2f,\"current\":%.3f,\"power\":%.2f,\"energy\":%.4f,\"frequency\":%.2f,\"pf\":%.3f}", voltage, current, power, energy, frequency, pf);
  characteristic->setValue((uint8_t*)payload, strlen(payload));
  characteristic->notify();
  Serial.println(payload);
  delay(1500);
}
