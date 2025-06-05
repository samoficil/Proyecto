import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Room } from "@/types/game";
import { useAuth } from "@/hooks/useAuth";
import { useWeb3 } from "@/hooks/useWeb3";
import { Users, DollarSign, Play, Wallet } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface RoomCardProps {
  room: Room;
  onJoinRoom: () => void;
  onUpdateRoom: (room: Room) => void;
}

export const RoomCard = ({ room, onJoinRoom, onUpdateRoom }: RoomCardProps) => {
  const { currentUser, updateUser } = useAuth();
  const { account, isConnected, connectWallet, sendPayment, isLoading } = useWeb3();
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinRoom = async () => {
    if (!currentUser) return;

    // Check if user already participated
    const userParticipation = room.participants.find(p => p.userId === currentUser.id);
    if (userParticipation) {
      onJoinRoom();
      return;
    }

    // Connect wallet if not connected
    if (!isConnected) {
      const connected = await connectWallet();
      if (!connected) return;
    }

    setIsJoining(true);
    
    try {
      // Send payment - $0.50 USD equivalent in BNB
      const transactionHash = await sendPayment(room.entryFee, room.id);
      if (!transactionHash) {
        setIsJoining(false);
        return;
      }

      // Find available numbers (1-200)
      const occupiedNumbers = room.participants.flatMap(p => p.numbersPurchased);
      const availableNumbers = [];
      for (let i = 1; i <= 200; i++) {
        if (!occupiedNumbers.includes(i)) {
          availableNumbers.push(i);
        }
      }

      if (availableNumbers.length === 0) {
        toast({
          title: "Sala llena",
          description: "No hay números disponibles en esta sala",
          variant: "destructive",
        });
        setIsJoining(false);
        return;
      }

      // Assign a random available number
      const assignedNumber = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];

      // Create new participant
      const newParticipant = {
        userId: currentUser.id,
        name: currentUser.name,
        walletAddress: account!,
        numbersPurchased: [assignedNumber],
        transactionHash
      };

      // Update room
      const updatedRoom = {
        ...room,
        participants: [...room.participants, newParticipant],
        prizePool: room.prizePool + room.entryFee
      };

      onUpdateRoom(updatedRoom);
      setIsJoining(false);
      onJoinRoom();

      toast({
        title: "¡Participación exitosa!",
        description: `Te asignamos el número ${assignedNumber}`,
      });

    } catch (error) {
      console.error('Error joining room:', error);
      setIsJoining(false);
      toast({
        title: "Error",
        description: "No se pudo procesar el pago",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = () => {
    switch (room.status) {
      case 'waiting': return 'text-green-400';
      case 'spinning': return 'text-yellow-400';
      case 'finished': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = () => {
    switch (room.status) {
      case 'waiting': return 'Esperando';
      case 'spinning': return 'Girando';
      case 'finished': return 'Finalizada';
      default: return 'Desconocido';
    }
  };

  const userParticipation = room.participants.find(p => p.userId === currentUser?.id);

  return (
    <Card className="bg-gray-800/50 border-gray-700 hover:border-green-500/50 transition-all duration-300 transform hover:scale-105">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-white">
          <span className="gradient-text">Sala #{room.id}</span>
          <span className={`text-sm ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-gray-400">
              {room.participants.length}/200
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-400" />
            <span className="text-sm text-gray-400">
              $0.50 USD
            </span>
          </div>
        </div>
        
        <div className="bg-gray-700/50 p-3 rounded-lg">
          <div className="text-xs text-gray-400 mb-1">Premio Total</div>
          <div className="text-lg font-bold text-green-400">
            $70.00 USD
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Giros: $10 + $10 + $50
          </div>
        </div>

        {userParticipation && (
          <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-3">
            <div className="text-xs text-blue-400 mb-1">Tus números:</div>
            <div className="flex flex-wrap gap-1">
              {userParticipation.numbersPurchased.map((number, index) => (
                <span 
                  key={index}
                  className="bg-blue-600 text-xs px-2 py-1 rounded text-white font-bold"
                >
                  {number}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="text-xs text-gray-400">Participantes: {room.participants.length}/200</div>
          <div className="h-16 overflow-y-auto">
            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: 200 }, (_, i) => i + 1).map(number => {
                const isOccupied = room.participants.some(p => p.numbersPurchased.includes(number));
                const isUserNumber = userParticipation?.numbersPurchased.includes(number);
                return (
                  <div
                    key={number}
                    className={`text-xs w-6 h-6 flex items-center justify-center rounded text-center ${
                      isUserNumber ? 'bg-blue-600 text-white' :
                      isOccupied ? 'bg-red-600 text-white' : 'bg-gray-600 text-gray-300'
                    }`}
                  >
                    {number}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <Button
          onClick={handleJoinRoom}
          disabled={isJoining || isLoading || room.status === 'finished' || room.participants.length >= 200}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isJoining || isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <>
              {!isConnected ? (
                <>
                  <Wallet className="h-4 w-4" />
                  Conectar Wallet
                </>
              ) : userParticipation ? (
                <>
                  <Play className="h-4 w-4" />
                  Ver Sala
                </>
              ) : room.participants.length >= 200 ? (
                'Sala Llena'
              ) : (
                <>
                  <DollarSign className="h-4 w-4" />
                  Unirse ($0.50)
                </>
              )}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
