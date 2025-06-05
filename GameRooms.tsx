
import { useState, useEffect } from "react";
import { RoomCard } from "./RoomCard";
import { WheelModal } from "./WheelModal";
import { Room } from "@/types/game";

export const GameRooms = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  useEffect(() => {
    // Initialize rooms
    const savedRooms = localStorage.getItem('cryptospin_rooms');
    if (savedRooms) {
      setRooms(JSON.parse(savedRooms));
    } else {
      const initialRooms: Room[] = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        participants: [],
        status: 'waiting',
        maxParticipants: 200,
        entryFee: 0.5, // $0.50 USD equivalent in BNB
        prizePool: 0,
        currentSpin: 0,
        totalSpins: 3,
        createdAt: new Date().toISOString(),
        results: [],
        prizes: [10, 10, 50] // $10, $10, $50 USD
      }));
      
      setRooms(initialRooms);
      localStorage.setItem('cryptospin_rooms', JSON.stringify(initialRooms));
    }
  }, []);

  const updateRoom = (updatedRoom: Room) => {
    const updatedRooms = rooms.map(room => 
      room.id === updatedRoom.id ? updatedRoom : room
    );
    setRooms(updatedRooms);
    localStorage.setItem('cryptospin_rooms', JSON.stringify(updatedRooms));
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold gradient-text mb-2">Salas de Juego</h2>
        <p className="text-gray-400">Únete a una sala y gira la ruleta para ganar BNB</p>
        <div className="mt-2 p-3 bg-blue-900/30 border border-blue-600 rounded-lg inline-block">
          <p className="text-blue-400 text-sm">
            💰 Costo de entrada: $0.50 USD | 🎯 Máximo 200 participantes
          </p>
          <p className="text-blue-400 text-sm">
            🏆 Premios: 1er giro $10 | 2do giro $10 | 3er giro $50
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {rooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            onJoinRoom={() => setSelectedRoom(room)}
            onUpdateRoom={updateRoom}
          />
        ))}
      </div>

      {selectedRoom && (
        <WheelModal
          room={selectedRoom}
          isOpen={!!selectedRoom}
          onClose={() => setSelectedRoom(null)}
          onUpdateRoom={updateRoom}
        />
      )}
    </div>
  );
};
