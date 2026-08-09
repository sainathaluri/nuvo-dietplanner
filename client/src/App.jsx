import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/context/AuthContext';
import { EnquiryProvider } from '@/context/EnquiryContext';
import { EnquiryModal } from '@/components/enquiry/EnquiryModal';
import { router } from '@/routes/router';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <EnquiryProvider>
          <RouterProvider router={router} />
          <EnquiryModal />
          <Toaster />
        </EnquiryProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
