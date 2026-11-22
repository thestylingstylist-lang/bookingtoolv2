-- Steps already on clients: "selling agent" becomes "seller's agent".
update public.steps set title = 'Send the offer to the seller''s agent' where title = 'Send the offer to the selling agent';
update public.steps set title = 'Hear back from the seller''s agent' where title = 'Hear back from the selling agent';
