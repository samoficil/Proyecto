
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Room, SpinResult } from "@/types/game";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { WheelVisual } from "./WheelVisual";

interface WheelModalProps {
  room: Room;
  isOpen: boolean;
  onClose: () => void;
  onUpdateRoom: (room: Room) => void;
}

export const WheelModal = ({ room, isOpen, onClose, onUpdateRoom }: WheelModalProps) => {
  const { currentUser, updateUser } = useAuth();
  const [countdown, setCountdown] = useState(7);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentWinningNumber, setCurrentWinningNumber] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen && room.participants.length >= 200 && room.status === 'waiting') {
      startSpinCycle();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isOpen, room.participants.length, room.status]);

  const startSpinCycle = () => {
    setCountdown(7);
    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          spinWheel();
          return 7;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const spinWheel = () => {
    if (room.currentSpin >= room.totalSpins) return;

    setIsSpinning(true);
    setCurrentWinningNumber(null);
  };

  const handleSpinComplete = (winningNumber: number) => {
    setCurrentWinningNumber(winningNumber);
    
    // Find winner by number
    const winner = room.participants.find(p => p.numbersPurchased.includes(winningNumber));
    
    if (winner) {
      const prizeAmount = room.prizes[room.currentSpin];

      // Update winner's balance if it's current user
      if (currentUser && winner.userId === currentUser.id) {
        const updatedUser = {
          ...currentUser,
          balance: currentUser.balance + prizeAmount,
          totalEarnings: currentUser.totalEarnings + prizeAmount,
          totalWins: currentUser.totalWins + 1,
          totalGames: currentUser.totalGames + 1,
          earningsHistory: [
            ...currentUser.earningsHistory,
            {
              id: Date.now(),
              amount: prizeAmount,
              roomId: room.id,
              date: new Date().toISOString(),
              type: 'win' as const
            }
          ]
        };
        updateUser(updatedUser);
      }

      // Create spin result
      const spinResult: SpinResult = {
        spin: room.currentSpin + 1,
        winner: {
          userId: winner.userId,
          name: winner.name,
          walletAddress: winner.walletAddress,
          numbersPurchased: winner.numbersPurchased,
          transactionHash: winner.transactionHash
        },
        winningNumber,
        amount: prizeAmount,
        date: new Date().toISOString()
      };

      // Update room
      const updatedRoom = {
        ...room,
        currentSpin: room.currentSpin + 1,
        status: room.currentSpin + 1 >= room.totalSpins ? 'finished' as const : 'spinning' as const,
        results: [...room.results, spinResult],
        lastWinner: {
          userId: winner.userId,
          name: winner.name,
          walletAddress: winner.walletAddress,
          numbersPurchased: winner.numbersPurchased,
          transactionHash: winner.transactionHash
        }
      };

      onUpdateRoom(updatedRoom);

      // Save recording when finished
      if (updatedRoom.status === 'finished') {
        saveRecording(updatedRoom);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }
    }

    setIsSpinning(false);
  };

  const saveRecording = (finalRoom: Room) => {
    const recordings = JSON.parse(localStorage.getItem('cryptospin_recordings') || '[]');
    const newRecording = {
      id: Date.now(),
      roomId: finalRoom.id,
      results: finalRoom.results,
      participants: finalRoom.participants,
      date: new Date().toISOString(),
      duration: finalRoom.totalSpins * 11 // Approximate duration
    };
    
    recordings.push(newRecording);
    localStorage.setItem('cryptospin_recordings', JSON.stringify(recordings));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center text-white">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-400 text-sm">GRABANDO</span>
            </div>
            Sala #{room.id} - {room.participants.length}/200 participantes
          </DialogTitle>
        </DialogHeader>
        
        <div className="text-center space-y-4">
          <WheelVisual
            participants={room.participants}
            isSpinning={isSpinning}
            winningNumber={currentWinningNumber}
            onSpinComplete={handleSpinComplete}
          />

          <div className="space-y-2">
            <div className="text-gray-400">
              {room.status === 'waiting' && room.participants.length < 200 ? (
                <>Esperando participantes... ({room.participants.length}/200)</>
              ) : room.status === 'waiting' ? (
                <>Próximo giro en: <span className="text-green-400 font-bold">{countdown}s</span></>
              ) : (
                'Girando...'
              )}
            </div>
            <div className="text-gray-400">
              Giro <span className="text-blue-400 font-bold">{room.currentSpin + 1}</span> de {room.totalSpins}
            </div>
            <div className="text-yellow-400 font-bold">
              Premio actual: ${room.prizes[room.currentSpin]} USD
            </div>
          </div>

          {currentWinningNumber && room.results.length > 0 && (
            <div className="bg-green-900/30 border border-green-600 rounded-lg p-3">
              <div className="text-green-400 font-bold">
                ¡Ganador del giro {room.results.length}!
              </div>
              <div className="text-white">
                Número {currentWinningNumber} - {room.results[room.results.length - 1]?.winner.name}
              </div>
              <div className="text-green-400">
                ${room.results[room.results.length - 1]?.amount} USD
              </div>
            </div>
          )}

          {room.results.length > 0 && (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              <div className="text-sm text-gray-400">Resultados anteriores:</div>
              {room.results.slice().reverse().map((result, index) => (
                <Badge key={index} variant="secondary" className="bg-gray-700 text-white mr-1 mb-1">
                  Giro {result.spin}: #{result.winningNumber} - {result.winner.name} - ${result.amount}
                </Badge>
              ))}
            </div>
          )}

          <Button 
            onClick={onClose}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
